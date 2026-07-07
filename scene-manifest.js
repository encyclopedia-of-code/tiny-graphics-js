const scene_list = [
  {name: "Minimal_Demo", path: "./examples/test-demos.js"},
  {name: "Minimal_Shading_Demo", path: "./examples/test-demos.js"},
  {name: "Instanced_Cubes_Demo", path: "./examples/instancing-demo.js"},
  {name: "Inertia_Demo", path: "./examples/collisions-demo.js"},
  {name: "Parametric_Surfaces", path: "./examples/parametric-surfaces.js"},
  {name: "Ephemeral_Demo", path: "./examples/ephemeral/ephemeral-demo.js"},
  {name: "Firefox_Test", path: "./examples/ephemeral/firefox-test.js"},
];

export async function load_scene(name) {
  const entry = scene_list.find( s => s.name === name );
  if (!entry) throw new Error("Scene not found");
  const definition = await import( entry.path );
  return definition[name];
}

const urlParams = new URLSearchParams(window.location.search);
export const main_scene_name = urlParams.get('main') || "Instanced_Cubes_Demo";
export const additional_scene_names = (urlParams.get('additional') || "")
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
