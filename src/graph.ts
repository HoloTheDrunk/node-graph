enum BuiltinType {
  Number = "Number", // TODO: remove, just here for testing
  GeoData = "GeoData", // TODO: split into different data formats
  Renderer = "Renderer",
  Texture = "Texture",
  CRS = "CRS", // Coordinate Reference System
}

type Type = string;
type Dependency = GraphNode | undefined | null;

abstract class GraphNode {
  public inputs: Map<string, Dependency>;
  public outputType: Type;

  private _out: [Number, any | undefined];

  public constructor(inputs: Map<string, Dependency>, outputType: Type) {
    this.inputs = inputs;
    this.outputType = outputType;
    this._out = [-1, undefined];
  }

  protected _apply(_frame: Number): any {
    throw new Error(`Unimplemented _apply() for ${this._node_type()}Node`);
  }

  protected _node_type(): string {
    throw new Error("Unimplemented _node_type()");
  }

  public getOutput(frame: Number): any {
    const [oFrane, oValue] = this._out;
    if (oValue == undefined || oFrane !== frame) {
      this._out = [frame, this._apply(frame)];
    }
    return this._out[1];
  }
}

class InputNode extends GraphNode {
  public value: any;

  public constructor(value: any, type: Type) {
    super(new Map(), type);
    this.value = value;
  }

  protected _apply(_frame: Number): any {
    return this.value;
  }

  protected _node_type(): string {
    return "Input";
  }
}

class ProcessorNode extends GraphNode {
  public callback: (frame: Number, args: any) => any;

  public constructor(
    inputs: Map<string, Dependency>,
    outputType: Type,
    callback: (frame: Number, args: any) => any,
  ) {
    super(inputs, outputType);
    this.callback = callback;
  }

  protected _apply(frame: Number): any {
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

  /**
   * Get a node by name.
   * @returns The node with the given name.
   */
  public get(name: string): GraphNode | undefined {
    return this.nodes.get(name);
  }

  /**
   * Add or update a node. If the node already exists, it will be updated.
   * Orphaned nodes will not be added if the graph has at least one node already.
   * @returns True if the node was added or updated, false otherwise.
   */
  public set(
    name: string,
    node: GraphNode,
    children: GraphNode[] = [],
  ): boolean {
    if (
      this.nodes.size > 0 &&
      node.inputs.size === 0 &&
      children.length === 0
    ) {
      return false;
    }

    this._valid = false;

    for (const child of children) {
      child.inputs.set(name, node);
    }

    this.nodes.set(name, node);
    this.types.add(node.outputType);

    return true;
  }

  /**
   * Add or update multiple nodes at once. Check the documentation of {@link set}
   * for more details.
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
   */
  private _validation_dfs(
    node: GraphNode,
    path: Set<string>,
    visited: Set<string>,
  ): boolean {
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

    return false;
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

      if (index < inputs.size - 1) {
        infix?.(node);
      }

      index++;
    }

    postfix?.(node);
  }
}

type NodeCallback = (node: GraphNode) => void;
type StringCallback = (string: string) => void;
interface DfsCallbacks {
  prefix?: NodeCallback;
  infix?: NodeCallback;
  postfix?: NodeCallback;
  undef?: StringCallback;
}

export { Graph, GraphNode, InputNode, ProcessorNode, BuiltinType };
