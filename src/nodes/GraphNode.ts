import { Type, Dependency, DumpDotStyle } from "../lib";

export default abstract class GraphNode {
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
