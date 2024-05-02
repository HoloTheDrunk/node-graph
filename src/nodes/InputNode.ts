import GraphNode from "./GraphNode";
import { Type, DumpDotStyle } from "../lib";

/** Represents a node that outputs a constant value. */
export default class InputNode extends GraphNode {
  public value: any;

  public constructor(value: any, type: Type) {
    super(new Map(), type);
    this.value = value;
  }

  protected _apply(_frame: number): any {
    return this.value;
  }

  protected get _node_type(): string {
    return "Input";
  }

  public get dumpDotStyle(): DumpDotStyle {
    return {
      label: (name) => `${name}: ${this.value}`,
      attrs: {
        shape: "invtrapezium",
        color: "goldenrod",
        style: "filled",
      },
    };
  }
}
