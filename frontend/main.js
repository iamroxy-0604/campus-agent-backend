// main.js
import Phaser from 'phaser';  // 改为从 node_modules 导入
import { CampusScene } from './scenes/CampusScene.js';
import { GymScene } from './scenes/GymScene.js';
import { McDonaldScene } from './scenes/McDonaldScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game',
    pixelArt: true,
    backgroundColor: '#000000',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768
    },
    scene: [CampusScene, GymScene, McDonaldScene, OfficeScene]
};

new Phaser.Game(config);