import Graph from "./Graph";
import GraphNode from "./nodes/GraphNode";
import InputNode from "./nodes/InputNode";
import ProcessorNode from "./nodes/ProcessorNode";

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

export {
  // Classes
  Graph,
  GraphNode,
  InputNode,
  ProcessorNode,

  // Types
  Type,
  Dependency,
  DumpDotStyle,

  // Utils
  BuiltinType,
};
