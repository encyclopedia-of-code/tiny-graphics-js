const scene_list = [
  {name: "Minimal_Demo", path: "./examples/test-demos.js"},
  {name: "Minimal_Shading_Demo", path: "./examples/test-demos.js"},
  {name: "Instanced_Cubes_Demo", path: "./examples/instancing-demo.js"},
  {name: "Inertia_Demo", path: "./examples/collisions-demo.js"},
  {name: "Parametric_Surfaces", path: "./examples/parametric-surfaces.js"},
  {name: "Ephemeral_Demo", path: "./examples/ephemeral/ephemeral-demos.js"},
  {name: "Firefox_Test", path: "./examples/ephemeral/firefox-test.js"},
];

export async function load_scenes(name) {
  const entry = scene_list.find( s => s.name === name );
  if (!entry) throw new Error("Scene not found");
  const module = await import( entry.path );
  return module;
}

export async function load_scene(name) {
  const module = await load_scenes(name);
  return module[name];
}

const urlParams = new URLSearchParams(window.location.search);
export const main_scene_name = urlParams.get('main') || "Instanced_Cubes_Demo";
export const additional_scene_names = (urlParams.get('additional') || "")
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
