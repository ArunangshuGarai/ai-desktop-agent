// test-robotjs.js
const robot = require('robotjs');

// Get screen size
const screenSize = robot.getScreenSize();
console.log(`Screen size: ${screenSize.width}x${screenSize.height}`);

// Get current mouse position
const mousePos = robot.getMousePos();
console.log(`Current mouse position: ${mousePos.x}, ${mousePos.y}`);

// Move mouse to center of screen
const centerX = Math.floor(screenSize.width / 2);
const centerY = Math.floor(screenSize.height / 2);
console.log(`Moving mouse to: ${centerX}, ${centerY}`);
robot.moveMouse(centerX, centerY);

console.log("Robot.js test completed!");