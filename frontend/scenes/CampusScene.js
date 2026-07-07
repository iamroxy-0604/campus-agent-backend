// scenes/CampusScene.js
import * as Phaser from 'phaser';
import { getProperty, showHint, updateHintPos, clearActiveHint } from '../utils/helpers.js';
import { sendDingdangMessage } from '../services/dingdangService.js';

export class CampusScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CampusScene' });
        this.moveTarget = null;
        this.SPEED = 180;
        this.currentEnterZone = null;
        this.isInteracting = false;
        this.dialogBox = null;
        this.dialogText = null;
        this.dialogName = null;
        this.enterZones = [];
        this.navOpen = false;
        this.navPanel = null;
        this.navOverlay = null;
        this.navInputElement = null;
    }

    preload() {
    this.load.tilemapTiledJSON('map', 'new.tmj');
    this.load.image('campusBg', '/campus.png');
    this.load.image('player', '/sucai/mygirl.png');
    this.load.image('npc_chen', '/sucai/chen.png');
    this.load.image('npc_gymren', '/sucai/gymren.png');
    this.load.image('npc_mcdown', '/sucai/mcdown.png');
    this.load.image('bg_gym', '/sucai/zi_gym.png');
    this.load.image('bg_mc', '/sucai/zi_mc.png');
    this.load.image('bg_office', '/sucai/zi_offical.png');
}
    create(data) {
        let startX = 632, startY = 156;
        this.physics.world.setBounds(0, 0, 1472, 1088);
        const savedPos = this.registry.get('returnPos');
        if (savedPos) {
            startX = savedPos.x;
            startY = savedPos.y;
            this.registry.remove('returnPos');
        } else {
            const map = this.make.tilemap({ key: 'map' });
            const entitiesLayer = map.getObjectLayer('Entities');
            if (entitiesLayer) {
                const startPoint = entitiesLayer.objects.find(obj => getProperty(obj, 'type') === 'player_start');
                if (startPoint) { startX = startPoint.x; startY = startPoint.y; }
            }
        }

        const bg = this.add.image(32.44, 52.40, 'campusBg');
        bg.setOrigin(0, 0);
        bg.setAlpha(0.7);
        const map = this.make.tilemap({ key: 'map' });

        // 碰撞层（只处理 collision 层）
        const collisionLayer = map.getObjectLayer('collision');
        this.collisionGroup = this.physics.add.staticGroup();
        if (collisionLayer) {
            collisionLayer.objects.forEach(obj => {
                let x, y, w, h;
                if (obj.width && obj.height && !obj.polygon) {
                    x = obj.x; y = obj.y; w = obj.width; h = obj.height;
                } else if (obj.polygon) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    obj.polygon.forEach(p => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                    });
                    x = obj.x + minX; y = obj.y + minY;
                    w = maxX - minX; h = maxY - minY;
                }
                if (w > 0 && h > 0) {
                    const cx = x + w/2, cy = y + h/2;
                    const rect = this.add.rectangle(cx, cy, w, h);
                    this.physics.add.existing(rect, true);
                    rect.body.immovable = true;
                    rect.visible = false;
                    this.collisionGroup.add(rect);
                }
            });
        }

        // 玩家
        this.player = this.add.sprite(startX, startY, 'player');
        this.player.setDisplaySize(36, 36);
        this.player.setOrigin(0.5, 0.5);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(8, 8);   // 缩小碰撞箱
        this.player.body.setOffset(14, 14);
        this.physics.add.collider(this.player, this.collisionGroup);

        this.cameras.main.setBounds(0, 0, 1472, 1088);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 建筑入口（enter 层）—— 只做触发区，不加碰撞体
        const enterLayer = map.getObjectLayer('enter');
        if (enterLayer) {
            enterLayer.objects.forEach(obj => {
                if (!obj.width || !obj.height) return;
                const cx = obj.x + obj.width/2, cy = obj.y + obj.height/2;
                // 创建触发区（用于 overlap 检测）
                const zone = this.add.rectangle(cx, cy, obj.width, obj.height);
                this.physics.add.existing(zone, true);
                zone.body.immovable = true;
                zone.visible = false;
                let target = getProperty(obj, 'targetScene');
                if (!target) target = getProperty(obj, 'action');
                let promptText = '';
                if (target === 'gym') promptText = '体育馆';
                else if (target === 'MCDOWN') promptText = '麦当劳餐厅';
                else if (target === 'office') promptText = '院长办公室';
                else if (target === 'door') promptText = '进入';
                if (promptText) {
                    zone.setData('target', target);
                    zone.setData('prompt', promptText);
                    this.enterZones.push({
                        target: target,
                        prompt: promptText,
                        zone: zone,
                        x: cx, y: cy, width: obj.width, height: obj.height
                    });
                }
            });
        }

        this.input.on('pointerdown', (pointer) => {
            if (this.isInteracting) return;
            const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.moveTarget = worldPos;
        });

        this.dialogBox = this.add.rectangle(512, 650, 860, 150, 0x000000, 0.85);
        this.dialogBox.setDepth(10);
        this.dialogBox.setVisible(false);
        this.dialogName = this.add.text(530, 615, '', { fontSize: '20px', fill: '#ffcc00', fontStyle: 'bold' });
        this.dialogName.setOrigin(0, 0);
        this.dialogName.setDepth(11);
        this.dialogName.setVisible(false);
        this.dialogText = this.add.text(530, 655, '', { fontSize: '20px', fill: '#fff', wordWrap: { width: 800 } });
        this.dialogText.setOrigin(0, 0);
        this.dialogText.setDepth(11);
        this.dialogText.setVisible(false);
        this.interactionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.navKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
        this.createNavigationPanel();

        const navHintBg = this.add.rectangle(88, 32, 136, 28, 0x000000, 0.3);
        navHintBg.setScrollFactor(0);
        navHintBg.setDepth(99);
        const navHint = this.add.text(20, 20, '按 T 打开导航面板', {
            fontSize: '16px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2
        });
        navHint.setScrollFactor(0);
        navHint.setDepth(100);
    }

    update() {
        updateHintPos(this);

        // 检测玩家与哪个入口区域重叠（精确检测）
        let closestEnter = null;
        for (let zone of this.enterZones) {
            if (this.physics.overlap(this.player, zone.zone)) {
                closestEnter = zone;
                break;
            }
        }
        if (closestEnter !== this.currentEnterZone) {
            this.currentEnterZone = closestEnter;
            if (this.currentEnterZone) {
                showHint(this, `按 E 进入 ${this.currentEnterZone.prompt}`, '#00ff00');
            } else {
                clearActiveHint();
            }
        }

        // 移动
        if (!this.isInteracting && this.moveTarget) {
            const dx = this.moveTarget.x - this.player.x;
            const dy = this.moveTarget.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 5) {
                this.player.body.setVelocity(0);
                this.moveTarget = null;
            } else {
                const angle = Math.atan2(dy, dx);
                this.player.body.setVelocity(Math.cos(angle) * this.SPEED, Math.sin(angle) * this.SPEED);
            }
        } else if (!this.isInteracting && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) {
            this.player.body.setVelocity(0);
        }

        // 按T打开/关闭导航面板
        if (Phaser.Input.Keyboard.JustDown(this.navKey)) {
            this.toggleNavigationPanel();
        }

        // 按E交互
        if (Phaser.Input.Keyboard.JustDown(this.interactionKey) && !this.isInteracting) {
            if (this.currentEnterZone) {
                const target = this.currentEnterZone.target;
                if (target === 'door') {
                    this.player.x = 604;
                    this.player.y = 222;
                    this.player.body.setVelocity(0);
                    this.moveTarget = null;
                    showHint(this, '你走进了校园', '#ffffff');
                } else if (target === 'gym') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('GymScene');
                } else if (target === 'MCDOWN') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('McDonaldScene');
                } else if (target === 'office') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('OfficeScene');
                }
            }
        }
    }

    createNavigationPanel() {
        const w = 420, h = 400;
        const x = 512, y = 384;

        const overlay = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.5);
        overlay.setScrollFactor(0);
        overlay.setDepth(19);
        overlay.setVisible(false);

        const panel = this.add.container(0, 0);
        panel.setScrollFactor(0);
        panel.setDepth(20);
        panel.setVisible(false);

        const bg = this.add.rectangle(x, y, w, h, 0x222222, 0.95);
        bg.setStrokeStyle(2, 0xffcc00);
        bg.setScrollFactor(0);
        bg.setDepth(20);

        const title = this.add.text(x, y - h / 2 + 30, '你想去哪里？', {
            fontSize: '24px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const subTitle = this.add.text(x, y - h / 2 + 65, '也可直接输入想去的地方：', {
            fontSize: '14px', fill: '#aaaaaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const destinations = [
            { label: '体育馆', scene: 'GymScene' },
            { label: '麦当劳餐厅', scene: 'McDonaldScene' },
            { label: '院长办公室', scene: 'OfficeScene' }
        ];

        const buttons = [];
        destinations.forEach((dest, i) => {
            const by = y - 10 + i * 55;
            const btnBg = this.add.rectangle(x, by, 280, 45, 0x444444, 1)
                .setInteractive({ useHandCursor: true })
                .setScrollFactor(0)
                .setDepth(21);
            const btnText = this.add.text(x, by, dest.label, {
                fontSize: '20px', fill: '#fff'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(22);

            btnBg.on('pointerover', () => btnBg.setFillStyle(0x666666));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x444444));
            btnBg.on('pointerdown', () => {
                this.closeNavigationPanel();
                this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                this.scene.start(dest.scene);
            });

            buttons.push(btnBg, btnText);
        });

        const closeY = y + h / 2 - 40;
        const closeBg = this.add.rectangle(x, closeY, 120, 35, 0x880000, 1)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(21);
        const closeText = this.add.text(x, closeY, '关闭', {
            fontSize: '18px', fill: '#fff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(22);
        closeBg.on('pointerover', () => closeBg.setFillStyle(0xaa0000));
        closeBg.on('pointerout', () => closeBg.setFillStyle(0x880000));
        closeBg.on('pointerdown', () => this.closeNavigationPanel());

        panel.add([bg, title, subTitle, ...buttons, closeBg, closeText]);

        this.navOverlay = overlay;
        this.navPanel = panel;
    }

    toggleNavigationPanel() {
        if (this.navOpen) {
            this.closeNavigationPanel();
        } else {
            this.openNavigationPanel();
        }
    }

    openNavigationPanel() {
        if (this.navOpen) return;
        this.navOpen = true;
        this.isInteracting = true;
        this.navPanel.setVisible(true);
        this.navOverlay.setVisible(true);
        this.createNavInputBox();
    }

    closeNavigationPanel() {
        if (!this.navOpen) return;
        this.navOpen = false;
        this.isInteracting = false;
        this.navPanel.setVisible(false);
        this.navOverlay.setVisible(false);
        this.removeNavInputBox();
    }

    // scenes/CampusScene.js - 只显示修改的部分（createNavInputBox 方法）
// 完整文件请保留之前的代码，只替换 createNavInputBox 方法

    createNavInputBox() {
        if (this.navInputElement) this.removeNavInputBox();

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '32%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.zIndex = '1000';
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.style.alignItems = 'center';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入想去的地方或想问的问题...';
        input.style.fontSize = '16px';
        input.style.padding = '10px';
        input.style.width = '300px';
        input.style.borderRadius = '6px';
        input.style.border = '2px solid #ffcc00';
        input.style.outline = 'none';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认';
        confirmBtn.style.fontSize = '16px';
        confirmBtn.style.padding = '8px 18px';
        confirmBtn.style.backgroundColor = '#ffcc00';
        confirmBtn.style.color = '#000';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '6px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = 'bold';

        div.appendChild(input);
        div.appendChild(confirmBtn);
        document.body.appendChild(div);

        this.navInputElement = div;
        input.focus();

        const onConfirm = async () => {
    const val = input.value.trim();
    if (!val) return;

    this.removeNavInputBox();
    showHint(this, '正在思考...', '#ffcc00');

    try {
        const { sendToLeader } = await import('../services/agentService.js');
        const result = await sendToLeader(val);
        
        console.log('[CampusScene] 用户智能体返回:', result);

        // 强制关键词匹配
        const mcdonaldsKeywords = ['麦当劳', '巨无霸', '汉堡', '麦辣鸡翅', '麦麦', '金拱门'];
        const isMcdonalds = mcdonaldsKeywords.some(kw => val.includes(kw));
        
        // 如果有麦当劳关键词且没有跳转，强制跳转
        if (isMcdonalds && result.intent !== 'navigate') {
            this.closeNavigationPanel();
            this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
            this.scene.start('McDonaldScene', {
                fromInput: val,
                aiReply: result.reply
            });
            return;
        }
        
        if (result.intent === 'navigate' && result.targetScene) {
            this.closeNavigationPanel();
            this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
            this.scene.start(result.targetScene, {
                fromInput: val,
                aiReply: result.reply
            });
        } else {
            showHint(this, result.reply || '收到你的消息啦', '#ffffff');
            this.openNavigationPanel();
        }
    } catch (error) {
        console.error('[CampusScene] 调用用户智能体失败:', error);
        showHint(this, '后端连接失败，请检查服务是否启动', '#ff6666');
        this.openNavigationPanel();
    }
};

        confirmBtn.addEventListener('click', onConfirm);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') onConfirm();
        });
    }

    removeNavInputBox() {
        if (this.navInputElement) {
            this.navInputElement.remove();
            this.navInputElement = null;
        }
    }

    getSceneLabel(sceneKey) {
        const map = { GymScene: '体育馆', McDonaldScene: '麦当劳', OfficeScene: '院长办公室' };
        return map[sceneKey] || sceneKey;
    }
}