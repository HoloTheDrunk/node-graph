enum BuiltinType {
  Number = "Number", // TODO: remove, just here for testing
  GeoData = "GeoData", // TODO: split into different data formats
  Renderer = "Renderer",
  Texture = "Texture",
  CRS = "CRS", // Coordinate Reference System
}

type Type = string;
type Dependency = GraphNode | undefined | null;

interface DumpDotStyle {
  label: (name: string) => string;
  attrs: { [key: string]: string };
}

abstract class GraphNode {
  public inputs: Map<string, Dependency>;
  public outputType: Type;

  private _out: [number, any | undefined];

  public constructor(inputs: Map<string, Dependency>, outputType: Type) {
    this.inputs = inputs;
    this.outputType = outputType;
    this._out = [-1, undefined];
  }

  protected _apply(_frame: number): any {
    throw new Error(`Unimplemented _apply() for ${this._node_type()}Node`);
  }

  protected _node_type(): string {
    throw new Error("Unimplemented _node_type()");
  }

  public getOutput(frame: number): any {
    const [oFrane, oValue] = this._out;
    if (oValue == undefined || oFrane !== frame) {
      this._out = [frame, this._apply(frame)];
    }
    return this._out[1];
  }

  public abstract get dumpDotStyle(): DumpDotStyle;

  public dumpDotAttr(name: string): string {
    const { label, attrs } = this.dumpDotStyle;
    const formattedAttrs = Object.entries(attrs)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");

    return `[label="${label(name)}" ${formattedAttrs}]`;
  }

  public dumpDotEdgeAttr(): string {
    return `[label=" ${this.outputType}"]`;
  }
}

class InputNode extends GraphNode {
  public value: any;

  public constructor(value: any, type: Type) {
    super(new Map(), type);
    this.value = value;
  }

  protected _apply(_frame: number): any {
    return this.value;
  }

  protected _node_type(): string {
    return "Input";
  }

  public get dumpDotStyle(): DumpDotStyle {
    return {
      label: (name) => `${name}: ${this.value}`,
      attrs: {
        shape: "invtrapezium",
        color: "goldenrod",
      },
    };
  }
}

class ProcessorNode extends GraphNode {
  public callback: (frame: number, args: any) => any;

  public constructor(
    inputs: { [name: string]: Dependency },
    outputType: Type,
    callback: (frame: number, args: any) => any,
  ) {
    super(new Map(Object.entries(inputs)), outputType);
    this.callback = callback;
  }

  protected _apply(frame: number): any {
    const inputs = Array.from(this.inputs) ?? [];
    const args: [string, any][] = inputs.map(([name, dependency]) => [
      name,
      dependency?.getOutput(frame) ?? null,
    ]);
    const argObj = Object.fromEntries(args);

    return this.callback(frame, argObj);
  }

  protected _node_type(): string {
    return "Processor";
  }

  public get dumpDotStyle(): DumpDotStyle {
    return {
      label: (name) => `${name}`,
      attrs: {
        shape: "box",
        color: "lightskyblue",
      },
    };
  }
}

/** Represents a directed graph that guarantees the absence of cycles on use. */
class Graph {
  public nodes: Map<string, GraphNode>;
  public types: Set<Type>;
  private _valid: boolean;

  public constructor() {
    this.nodes = new Map();
    this.types = new Set();
    this._valid = false;
  }

  public get valid(): boolean {
    return this._valid;
  }

  public dumpDot(): string {
    const dump: string[] = ["digraph G {"];

    if (this.nodes.size > 0) {
      // Declare nodes
      dump.push("\t{");
      for (const [name, node] of this.nodes) {
        dump.push(`\t\t"${name}" ${node.dumpDotAttr(name)};`);
      }
      dump.push("\t}");

      // Declare edges
      const entries = Array.from(this.nodes.entries());
      for (const [name, node] of this.nodes) {
        for (const [_, dep] of node.inputs) {
          if (dep == null) continue;

          const inputName = entries.find(([_, oNode]) => oNode == dep)![0];
          const attrs = node.dumpDotEdgeAttr();

          dump.push(`\t"${inputName}" -> "${name}" ${attrs};`);
        }
      }
    }

    dump.push("}");

    return dump.join("\n");
  }

  /**
   * Get the output of a node at a given frame.
   * @throws If the graph is invalid.
   * @throws If the node does not exist.
   * @returns The output of the node at the given frame.
   */
  public getOutput(frame: number, node: string | GraphNode): any {
    this.validate();

    const out = typeof node === "string" ? this.nodes.get(node) : node;

    if (out == undefined) {
      throw new Error(`Node ${node} does not exist`);
    }

    return out.getOutput(frame);
  }

  /**
   * Get a node by name.
   * @returns The node with the given name.
   */
  public get(name: string): GraphNode | undefined {
    return this.nodes.get(name);
  }

  /**
   * Add or update a node. If the node already exists, it will be updated.
   * @throws If the node is orphaned and the graph has at least one node already.
   * @returns True if the node was added or updated, false otherwise.
   */
  public set(name: string, node: GraphNode): boolean {
    if (this.nodes.size > 0 && node.inputs.size === 0) {
      throw new Error("Orphaned node");
    }

    this._valid = false;

    this.nodes.set(name, node);
    this.types.add(node.outputType);

    return true;
  }

  /**
   * Add or update multiple nodes at once. Check the documentation of {@link set}
   * for more details.
   * Using numerical object keys is not recommended, as they will be automatically sorted,
   * possibly leading to unexpected behavior.
   * @throws If any of the nodes are orphaned and the graph has at least one node already.
   * @returns A map of the results of the set operation.
   */
  public set_grouped(nodes: {
    [name: string]: GraphNode;
  }): Map<string, boolean> {
    const results = new Map();
    for (const [name, node] of Object.entries(nodes)) {
      results.set(name, this.set(name, node));
    }
    return results;
  }

  /**
   * Determine if the graph is valid. A graph is considered valid if it does
   * not contain cycles nor dangling dependencies.
   * @throws If the graph is invalid.
   */
  public validate() {
    if (this._valid) {
      return;
    }

    const visited = new Set<string>();
    for (const [name, node] of this.nodes) {
      if (visited.has(name)) {
        continue;
      }

      this._validation_dfs(node, new Set(), visited);
    }

    this._valid = true;
  }

  /**
   * Depth-first search for cycles and dangling dependencies.
   * @throws If a cycle is detected or a dangling dependency is found.
   */
  private _validation_dfs(
    node: GraphNode,
    path: Set<string>,
    visited: Set<string>,
  ) {
    // Cycle detection
    for (const [name, _dep] of node.inputs ?? []) {
      if (path.has(name)) {
        throw new Error(
          `Cycle detected: ${Array.from(path).join(" -> ")} -> ${name}`,
        );
      }
    }

    // DFS
    for (const [name, dep] of node.inputs ?? []) {
      // Dangling dependency check
      if (dep == undefined) {
        throw new Error(`Dangling dependency: ${name}`);
      }

      if (visited.has(name)) {
        continue;
      }

      path.add(name);
      this._validation_dfs(dep, path, visited);
      path.delete(name);
    }
  }

  /** Depth-first traversal of the graph. */
  public dfs(node: GraphNode, { prefix, infix, postfix, undef }: DfsCallbacks) {
    prefix?.(node);

    const inputs = node.inputs;

    let index = 0;
    for (const [name, input] of inputs.entries()) {
      if (input != undefined) {
        this.dfs(input, { prefix, infix, postfix, undef });
      } else {
        undef?.(name);
        index++;
        continue;
      }

      // Run the infix between every dependency
      if (index < inputs.size - 1) {
        infix?.(node);
      }

      index++;
    }

    // Run the infix at least once per node even without dependencies
    if (inputs.size <= 1) {
      infix?.(node);
    }

    postfix?.(node);
  }
}

type NodeCallback = (node: GraphNode) => void;
type StringCallback = (string: string) => void;
interface DfsCallbacks {
  /** Run before the dependencies. */
  prefix?: NodeCallback;
  /** Run between every dependency or once if less than 2 dependencies. */
  infix?: NodeCallback;
  /** Run after the dependencies. */
  postfix?: NodeCallback;
  /** Run when an undefined dependency is found. */
  undef?: StringCallback;
}

export { Graph, GraphNode, InputNode, ProcessorNode, BuiltinType };
