import * as graph from "./lib";

// Util
function logSection(
  title: string,
  content: any,
  ansiColor: string,
  func?: (content: any) => void,
) {
  console.log(`\n\x1b[1;33m${title}\x1b[0m`);
  if (func) {
    func(content);
  } else {
    console.log(`\x1b[${ansiColor}m${content}\x1b[0m`);
  }
}

console.log("Goal: (\\x -> succ x) 5");

const g = new graph.Graph();
logSection("Graph before adding nodes", g, "2", (s) =>
  console.dir(s, { depth: null }),
);

// Keeping outside references to relevant nodes makes the code more readable.
// Could also make Graph::set(_grouped) return the node(s).
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

logSection("Graph after adding nodes", g, "2", (s) =>
  console.dir(s, { depth: null }),
);

// Getting the output from the graph instead of directly from a node
// allows us to check the validity of the graph for the user.
// Equivalent to `succ.getOutput(0, "succ")` in this case.
const output = g.getOutput(0, succ);

logSection("Output", output, "1");

const dumpDot = g.dumpDot();
const dumpDotLink = ((dot: string): string => {
  const escaped = dot
    .replaceAll(/\s+/g, " ")
    .replaceAll(":", "%3A")
    .replaceAll(";", "%3B")
    .replaceAll("=", "%3D");
  return `https://dreampuf.github.io/GraphvizOnline/#${escaped}`;
})(dumpDot);

logSection("Dot", dumpDot, "2");
logSection("GraphViz", dumpDotLink, "36");
