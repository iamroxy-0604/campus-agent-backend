// main.js
import Phaser from 'phaser';  // 改为从 node_modules 导入
import { CampusScene } from './scenes/CampusScene.js';
import { GymScene } from './scenes/GymScene.js';
import { McDonaldScene } from './scenes/McDonaldScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';
import { BulletinScene } from './scenes/BulletinScene.js';
import { ServiceHallScene } from './scenes/ServiceHallScene.js';
import { LibraryScene } from './scenes/LibraryScene.js';
import { DormScene } from './scenes/DormScene.js';
import { ComputerLabScene } from './scenes/ComputerLabScene.js';
import { ResearchScene } from './scenes/ResearchScene.js';

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
    scene: [
        CampusScene,
        GymScene,
        McDonaldScene,
        OfficeScene,
        BulletinScene,
        ServiceHallScene,
        LibraryScene,
        DormScene,
        ComputerLabScene,
        ResearchScene,
    ]
};

new Phaser.Game(config);
