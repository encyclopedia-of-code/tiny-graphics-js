const scene_list = [
//   {name: "Axes_Viewer", path: "./examples/axes-viewer.js"},
//   {name: "Axes_Viewer_Test_Scene", path: "./examples/axes-viewer.js"},
  {name: "Instanced_Cubes_Demo", path: "./examples/instancing-demos.js"},
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
