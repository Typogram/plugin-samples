interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

figma.showUI(__html__, { width: 300, height: 400 });

interface OverlapResult {
  artboardName: string;
  overlappingWith: string[];
}

// Check if two rectangles overlap
function checkOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x >= rect2.x + rect2.width ||
    rect1.x + rect1.width <= rect2.x ||
    rect1.y >= rect2.y + rect2.height ||
    rect1.y + rect1.height <= rect2.y
  );
}

// Get rectangle bounds from a node
function getNodeBounds(node: SceneNode): Rectangle {
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
}

// Main function to find overlapping artboards
function findOverlappingArtboards(
  parentNode: FrameNode | SectionNode
): OverlapResult[] {
  const results: OverlapResult[] = [];
  const childFrames = parentNode.children.filter(
    (child) => child.type === "FRAME"
  ) as FrameNode[];

  // Compare each frame with every other frame
  for (let i = 0; i < childFrames.length; i++) {
    const currentFrame = childFrames[i];
    const overlappingWith: string[] = [];

    for (let j = 0; j < childFrames.length; j++) {
      if (i !== j) {
        const otherFrame = childFrames[j];
        if (
          checkOverlap(getNodeBounds(currentFrame), getNodeBounds(otherFrame))
        ) {
          overlappingWith.push(otherFrame.name);
        }
      }
    }

    if (overlappingWith.length > 0) {
      results.push({
        artboardName: currentFrame.name,
        overlappingWith,
      });
    }
  }

  return results;
}

// Handle messages from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "check-overlaps") {
    const selection = figma.currentPage.selection;

    if (selection.length !== 1) {
      figma.ui.postMessage({
        type: "error",
        message: "Please select exactly one parent frame",
      });
      return;
    }

    const selectedNode = selection[0];
    if (selectedNode.type !== "FRAME" && selectedNode.type !== "SECTION") {
      figma.ui.postMessage({
        type: "error",
        message: "Selected item must be a frame or section",
      });
      return;
    }

    const overlappingArtboards = findOverlappingArtboards(selectedNode);
    figma.ui.postMessage({
      type: "results",
      results: overlappingArtboards,
    });
  }
};
