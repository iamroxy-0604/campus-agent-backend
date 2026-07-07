// utils/helpers.js
export let activeHint = null;

export function getProperty(obj, propName) {
    if (!obj.properties) return undefined;
    const prop = obj.properties.find(p => p.name === propName);
    return prop ? prop.value : undefined;
}

export function showHint(scene, text, color = '#ffff00') {
    if (activeHint) activeHint.destroy();
    activeHint = scene.add.text(scene.player.x, scene.player.y - 50, text, {
        fontSize: '18px', color, stroke: '#000', strokeThickness: 3,
        backgroundColor: '#000000aa', padding: { x: 8, y: 6 }
    });
    activeHint.setOrigin(0.5);
    scene.time.delayedCall(1500, () => {
        if (activeHint) activeHint.destroy();
        activeHint = null;
    });
}

export function updateHintPos(scene) {
    if (activeHint) activeHint.setPosition(scene.player.x, scene.player.y - 60);
}

export function clearActiveHint() {
    if (activeHint) {
        activeHint.destroy();
        activeHint = null;
    }
}

export function getActiveHint() {
    return activeHint;
}

export function createTalkBubble(scene, x, y, isPlayer = true) {
    const offsetY = isPlayer ? -70 : -90;
    const bubble = scene.add.graphics();
    bubble.fillStyle(0xffffff, 1);
    const width = 40, height = 40;
    bubble.fillRoundedRect(x - width/2, y + offsetY - height/2, width, height, 10);
    bubble.lineStyle(2, 0x000000, 1);
    bubble.strokeRoundedRect(x - width/2, y + offsetY - height/2, width, height, 10);
    if (isPlayer) {
        bubble.fillTriangle(x - 10, y + offsetY - height/2, x, y + offsetY - height/2 + 12, x + 10, y + offsetY - height/2);
        bubble.strokeTriangle(x - 10, y + offsetY - height/2, x, y + offsetY - height/2 + 12, x + 10, y + offsetY - height/2);
    } else {
        bubble.fillTriangle(x - 10, y + offsetY + height/2, x, y + offsetY + height/2 - 12, x + 10, y + offsetY + height/2);
        bubble.strokeTriangle(x - 10, y + offsetY + height/2, x, y + offsetY + height/2 - 12, x + 10, y + offsetY + height/2);
    }
    const dots = scene.add.text(x, y + offsetY, '...', { fontSize: '20px', fill: '#000' });
    dots.setOrigin(0.5);
    return { bubble, dots };
}

export function destroyTalkBubble(bubbleObj) {
    if (bubbleObj) {
        bubbleObj.bubble.destroy();
        bubbleObj.dots.destroy();
    }
}