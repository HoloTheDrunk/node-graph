import * as graph from "./graph";

const g = new graph.Graph();
console.dir(g, { depth: null });

// Keeping outside references to relevant nodes makes the code more readable.
// Could also make Graph::set return the node.
const five = new graph.InputNode(5, graph.BuiltinType.Number);
const succ = new graph.ProcessorNode(
  new Map(Object.entries({ value: five })),
  graph.BuiltinType.Number,
  (_frame, args) => (args.value as number) + 1,
);

g.set("five", five);
g.set("succ", succ);

g.validate();

// Getting the output like this directly from a node (instead of e.g. a
// designated graph output) makes implementing a "preview" mode trivial.
const output = succ.getOutput(0);

console.dir(g, { depth: null });
console.log(`Output: ${output}`);
