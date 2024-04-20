/**
 * Reorders layer names so that nested layers appear immediately before their root layers.
 * @param layers Array of layer names including nested layers.
 * @returns New array of layer names with nested layers reordered.
 */

export function reorderNestedLayers(layers: string[]): string[] {
  // Create a new array to store the reordered layers
  const reordered: string[] = [];

  // Iterate over each layer
  layers.forEach((layer) => {
    // Split the layer to detect if it is a nested layer
    const parts = layer.split(".");
    if (parts.length > 1) {
      // It's a nested layer, find its parent index
      const parentName = parts.slice(0, -1).join(".");
      const parentIndex = reordered.findIndex((el) => el === parentName);
      if (parentIndex !== -1) {
        // Insert the nested layer right before its parent
        reordered.splice(parentIndex, 0, layer);
      } else {
        // If parent is not yet in the list, just add at the end
        reordered.push(layer);
      }
    } else {
      // Not a nested layer, add normally at the end
      reordered.push(layer);
    }
  });

  return reordered;
}
