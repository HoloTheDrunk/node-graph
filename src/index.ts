import * as graph from "./graph";

const g = new graph.Graph();
console.dir(g, { depth: null });

// Keeping outside references to relevant nodes makes the code more readable.
// Could also make Graph::set(_grouped)? return the node(s).
const five = new graph.InputNode(
  // Value
  5,
  // Type of said value
  graph.BuiltinType.Number,
);
const succ = new graph.ProcessorNode(
  // Inputs, will be checked for null on graph validation.
  { value: five },
  // Output type
  graph.BuiltinType.Number,
  // Callback, the `args` object's fields match the inputs.
  (_frame, args) => (args.value as number) + 1,
);

try {
  // These two methods are equivalent.
  // g.set("five", five);
  // g.set("succ", succ);
  g.set_grouped({ five, succ });
} catch (e) {
  console.error(`Invalid set_grouped call: ${e}`);
}

// Getting the output from the graph instead of directly from a node
// allows us to check the validity of the graph for the user.
// Equivalent to `succ.getOutput(0, "succ")` in this case.
const output = g.getOutput(0, succ);

console.dir(g, { depth: null });
console.log(`Output: ${output}`);
console.log(`Dot:\n${g.dumpDot()}`);
