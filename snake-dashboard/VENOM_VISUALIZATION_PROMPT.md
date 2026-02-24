# Implementation of the Venom Visualization Suite

**Context:** You are working on a Next.js 14+ application featuring a D3-powered radial Hyperbolic Tree that visualizes snake phylogeny. The tree uses a radial cluster layout where the center is the root and leaves are species nodes.

**Objective:** Implement a hierarchical "Venom" selection system that dynamically reconfigures the tree's geometry, styling, and physics based on venom data.

### 1. Hierarchical UI (The "Venom Pill")
- **Structure:** Implement a top-level "Venom" pill (styled exactly like the existing "Region" pills). 
- **Interaction:** Clicking the Venom pill must reveal a sub-menu of "children pills": **Classification**, **Potency (LD50)**, and **Yield (mg)**. 
- **Mutual Exclusivity:** Potency and Yield can be selected simultaneously. However, if either is active, the **Classification** pill must be visually disabled (faded and scaled down) and de-selected to prevent color-scale conflicts.

### 2. Geometric & Visual Encodings
- **Potency (Branch Extension):** When Potency is active, extend the `y` coordinate (radius) of species nodes based on their potency score (0–100). The **Inland Taipan** must have the maximum extension (+1200 units), making its branch the longest in the tree.
- **Yield (Node Scaling):** When Yield is active, scale the radius of species nodes based on their typical venom yield. 
- **Combined View:** If both are active, potency determines the branch length and the color scale (deep red/purple), while yield determines the node size.
any non venomous snake should be faded like disabled branches when selecting a region in region view


### 4. Advanced Physics & Layout
- **Node Repulsion:** Implement a `d3-force` collision simulation to prevent node overlap. Since Yield increases node size and Potency shifts radial positions, nodes will collide angularly. Convert polar coordinates to Cartesian, run a collision simulation with a `forceRadial` constraint to preserve branch lengths, and map back to polar.
- **Visual Benchmark:** Add a circular background radial gradient. The outer boundary of this gradient must be dynamically calculated to pass exactly through the center of the **Inland Taipan** node, serving as a visual "Potency Benchmark."

### 5. Motion & Polish
- **Eliminate Snapping:** All layout changes (geometry shifts, radius scaling, and opacity toggles) must be animated.
Use same effects and like the existing hyperbolic tree animations, study region view, understand the code properly
