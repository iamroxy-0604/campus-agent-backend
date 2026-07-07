// scenes/SimpleInteriorScene.js
// 无NPC的简单室内场景 —— 仅展示背景图，ESC返回校园
import * as Phaser from 'phaser';

export class SimpleInteriorScene extends Phaser.Scene {
    constructor(key, bgKey, sceneName) {
        super({ key });
        this.bgKey = bgKey;
        this.sceneName = sceneName;
    }

    create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // 背景图
        const bg = this.add.image(0, 0, this.bgKey);
        bg.setOrigin(0, 0);
        const scaleX = W / bg.width;
        const scaleY = H / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        bg.setPosition((W - bg.width * scale) / 2, (H - bg.height * scale) / 2);

        // 场景名称
        const nameBg = this.add.rectangle(W / 2, 55, 300, 50, 0x000000, 0.7);
        nameBg.setDepth(5);
        const nameText = this.add.text(W / 2, 55, `📍 ${this.sceneName}`, {
            fontSize: '26px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(6);

        // 返回提示
        const hintBg = this.add.rectangle(W / 2, H - 30, 250, 35, 0x000000, 0.6);
        hintBg.setDepth(5);
        const hintText = this.add.text(W / 2, H - 30, '按 ESC 返回校园', {
            fontSize: '18px', fill: '#ffffff'
        }).setOrigin(0.5).setDepth(6);

        // 玩家小人（装饰，放在场景底部中央）
        const player = this.add.sprite(W / 2, H - 120, 'player');
        player.setDisplaySize(100, 100);
        player.setDepth(3);

        // ESC返回
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('CampusScene');
        });
    }
}
