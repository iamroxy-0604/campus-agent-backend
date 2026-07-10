// scenes/CampusScene.js
import * as Phaser from 'phaser';
import { getProperty, showHint, updateHintPos, clearActiveHint } from '../utils/helpers.js';
import { sendDingdangMessage } from '../services/dingdangService.js';
import { SidebarUI } from '../utils/SidebarUI.js';

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
    this.load.image('board', '/sucai/board.png');
    // 新场景背景图
    this.load.image('bg_gym_new', '/sucai/zi_gym_new.png');
    this.load.image('bg_office_new', '/sucai/zi_office_new.png');
    this.load.image('bg_service', '/sucai/zi_service.png');
    this.load.image('bg_library', '/sucai/zi_library.png');
    this.load.image('bg_dorm', '/sucai/zi_dorm.png');
    this.load.image('bg_computerlab', '/sucai/zi_computerlab.png');
    this.load.image('bg_research', '/sucai/zi_research.png');
    this.load.image('player2', '/sucai/player2.png');
}
    create(data) {
        // 每次进入场景重置关键状态
        this.enterZones = [];
        this.moveTarget = null;
        this.currentEnterZone = null;
        this.isInteracting = false;
        this.navOpen = false;

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

        // 玩家二（键盘方向键控制）
        this.player2 = this.add.sprite(startX + 80, startY, 'player2');
        this.player2.setDisplaySize(36, 36);
        this.player2.setOrigin(0.5, 0.5);
        this.physics.add.existing(this.player2);
        this.player2.body.setCollideWorldBounds(true);
        this.player2.body.setSize(8, 8);
        this.player2.body.setOffset(14, 14);
        this.physics.add.collider(this.player2, this.collisionGroup);

        // 键盘 WASD（玩家一）
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        // 方向键（玩家二）
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

        this.cameras.main.setBounds(0, 0, 1472, 1088);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 交友弹窗元素（不用Container，直接场景对象避免点击失效）
        this.socialElements = [];
        this._buildSocialPopup();

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

        // 公告栏实体
        const boardX = 400, boardY = 200;
        const boardSprite = this.add.sprite(boardX, boardY, 'board');
        boardSprite.setDisplaySize(48, 48);
        boardSprite.setDepth(5);
        const boardZone = this.add.rectangle(boardX, boardY, 80, 80);
        this.physics.add.existing(boardZone, true);
        boardZone.body.immovable = true;
        boardZone.visible = false;
        this.enterZones.push({
            target: 'bulletin',
            prompt: '校园公告栏',
            zone: boardZone,
            x: boardX, y: boardY, width: 80, height: 80
        });

        // ---- 新建筑入口区域（按命名匹配校园地图位置）----
        const newBuildings = [
            { id: 'library', name: '图书馆', x: 900, y: 531, scene: 'LibraryScene' },
            { id: 'computer_lab', name: '机房', x: 1050, y: 598, scene: 'ComputerLabScene' },
            { id: 'dorm', name: '宿舍', x: 516, y: 423, scene: 'DormScene' },
            { id: 'service_hall', name: '事务大厅', x: 923, y: 633, scene: 'ServiceHallScene' },
            { id: 'research', name: '科研楼', x: 1138, y: 363, scene: 'ResearchScene' },
            { id: 'teacher_office', name: '教师办公室', x: 219, y: 655, scene: 'TeacherOfficeScene' },
        ];

        newBuildings.forEach(b => {
            const zone = this.add.rectangle(b.x, b.y, 90, 90);
            this.physics.add.existing(zone, true);
            zone.body.immovable = true;
            zone.visible = false;
            this.enterZones.push({
                target: b.id,
                prompt: b.name,
                zone: zone,
                x: b.x, y: b.y, width: 90, height: 90,
                scene: b.scene
            });
        });

        // ---- 侧边栏 ----
        this.sidebar = new SidebarUI(this);
        this.sidebar.create();

        const sidebarHint = this.add.text(68, 200, '◀', {
            fontSize: '14px', fill: '#888888'
        }).setScrollFactor(0).setDepth(52);
        const sidebarHint2 = this.add.text(68, 388, '侧', { fontSize: '11px', fill: '#888888' }).setScrollFactor(0).setDepth(52);
        const sidebarHint3 = this.add.text(68, 400, '栏', { fontSize: '11px', fill: '#888888' }).setScrollFactor(0).setDepth(52);

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

        // 坐标显示器（调试用，左上角）
        this.coordDisplay = this.add.text(10, 10, '', {
            fontSize: '16px', fill: '#00ff00', fontFamily: 'monospace',
            backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
            stroke: '#000000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(200);
    }

    update() {
        const SPD = this.SPEED;
        // 实时坐标显示（双人）
        if (this.coordDisplay && this.player && this.player2) {
            this.coordDisplay.setText(
                `🚶P1 x:${Math.round(this.player.x)} y:${Math.round(this.player.y)}\n🚶P2 x:${Math.round(this.player2.x)} y:${Math.round(this.player2.y)}`
            );
        }
        updateHintPos(this);

        // ---- 键盘移动 ----
        const socialVisible = this.socialElements.length > 0 && this.socialElements[0].visible;
        const canMove = !this.isInteracting && !socialVisible;
        if (canMove) {
            // 玩家一 WASD（优先键盘，否则鼠标点选）
            let p1vx = 0, p1vy = 0;
            if (this.keyA.isDown) p1vx = -SPD;
            else if (this.keyD.isDown) p1vx = SPD;
            if (this.keyW.isDown) p1vy = -SPD;
            else if (this.keyS.isDown) p1vy = SPD;

            if (p1vx !== 0 || p1vy !== 0) {
                this.moveTarget = null;
                this.player.body.setVelocity(p1vx, p1vy);
            } else if (this.moveTarget) {
                const dx = this.moveTarget.x - this.player.x;
                const dy = this.moveTarget.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 5) { this.player.body.setVelocity(0); this.moveTarget = null; }
                else {
                    const a = Math.atan2(dy, dx);
                    this.player.body.setVelocity(Math.cos(a) * SPD, Math.sin(a) * SPD);
                }
            } else {
                this.player.body.setVelocity(0);
            }

            // 玩家二 方向键
            let p2vx = 0, p2vy = 0;
            if (this.keyLeft.isDown) p2vx = -SPD;
            else if (this.keyRight.isDown) p2vx = SPD;
            if (this.keyUp.isDown) p2vy = -SPD;
            else if (this.keyDown.isDown) p2vy = SPD;
            this.player2.body.setVelocity(p2vx, p2vy);
        } else {
            // 弹窗打开时立即归零速度，防止小人滑走
            this.player.body.setVelocity(0);
            this.player2.body.setVelocity(0);
            this.moveTarget = null;
        }

        // ---- 双人相遇检测 ----
        if (this.player && this.player2) {
            const socialVisible = this.socialElements.length > 0 && this.socialElements[0].visible;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.player2.x, this.player2.y);
            if (dist < 60 && !this.isInteracting && !socialVisible && !this._socialLocked) {
                this._showSocialPopup();
            } else if (dist >= 80 && socialVisible && !this._socialLocked) {
                this._hideSocialPopup();
            }
        }

        // 检测进入区域（玩家一 + 玩家二）
        let closestEnter = null;
        for (let zone of this.enterZones) {
            if (this.physics.overlap(this.player, zone.zone) ||
                this.physics.overlap(this.player2, zone.zone)) {
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

        // 按T
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
                } else if (target === 'bulletin') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('BulletinScene');
                } else if (target === 'service_hall') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('ServiceHallScene');
                } else if (target === 'library') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('LibraryScene');
                } else if (target === 'dorm') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('DormScene');
                } else if (target === 'computer_lab') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('ComputerLabScene');
                } else if (target === 'research') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('ResearchScene');
                } else if (target === 'teacher_office') {
                    this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                    this.scene.start('TeacherOfficeScene');
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

        const subTitle = this.add.text(x, y - h / 2 + 65, '滚轮滑动选择 / 直接输入：', {
            fontSize: '14px', fill: '#aaaaaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

        const destinations = [
            { label: '体育馆', scene: 'GymScene' },
            { label: '麦当劳餐厅', scene: 'McDonaldScene' },
            { label: '院长办公室', scene: 'OfficeScene' },
            { label: '事务大厅', scene: 'ServiceHallScene' },
            { label: '图书馆', scene: 'LibraryScene' },
            { label: '宿舍', scene: 'DormScene' },
            { label: '机房', scene: 'ComputerLabScene' },
            { label: '科研楼', scene: 'ResearchScene' },
            { label: '教师办公室', scene: 'TeacherOfficeScene' },
        ];

        // 可滚动列表区域
        const listTop = y - h / 2 + 90;
        const listH = 240;
        const itemH = 38;
        const itemGap = 6;
        const totalH = destinations.length * (itemH + itemGap);

        // 裁剪遮罩
        const maskGfx = this.make.graphics();
        maskGfx.fillRect(x - w / 2 + 20, listTop, w - 40, listH);
        const mask = maskGfx.createGeometryMask();

        const listCtn = this.add.container(0, 0);
        listCtn.setScrollFactor(0);
        listCtn.setDepth(21);
        listCtn.setMask(mask);

        destinations.forEach((dest, i) => {
            const by = i * (itemH + itemGap) + itemH / 2;
            const btnBg = this.add.rectangle(x, by, 280, itemH, 0x444444, 1)
                .setInteractive({ useHandCursor: true })
                .setScrollFactor(0)
                .setDepth(21);
            const btnText = this.add.text(x, by, dest.label, {
                fontSize: '17px', fill: '#fff'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(22);

            btnBg.on('pointerover', () => btnBg.setFillStyle(0x666666));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0x444444));
            btnBg.on('pointerdown', () => {
                this.closeNavigationPanel();
                this.registry.set('returnPos', { x: this.player.x, y: this.player.y });
                this.scene.start(dest.scene);
            });

            listCtn.add([btnBg, btnText]);
        });

        panel.add(listCtn);

        // 滚轮滚动
        let scrollY = 0;
        const wheelHandler = (pointer, go, dx, dy) => {
            if (!this.navOpen) return;
            scrollY += dy * 0.3;
            scrollY = Phaser.Math.Clamp(scrollY, 0, Math.max(0, totalH - listH));
            listCtn.y = listTop - scrollY;
        };
        this.input.on('wheel', wheelHandler);
        this._navWheelHandler = wheelHandler;

        const closeY = y + h / 2 - 30;
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

        panel.add([bg, title, subTitle, closeBg, closeText]);

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
        if (this._navWheelHandler) {
            this.input.off('wheel', this._navWheelHandler);
            this._navWheelHandler = null;
        }
    }

    // scenes/CampusScene.js - 只显示修改的部分（createNavInputBox 方法）
// 完整文件请保留之前的代码，只替换 createNavInputBox 方法

    createNavInputBox() {
        if (this.navInputElement) this.removeNavInputBox();

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '26%';
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
        const map = { GymScene: '体育馆', McDonaldScene: '麦当劳', OfficeScene: '院长办公室', ServiceHallScene: '事务大厅', LibraryScene: '图书馆', DormScene: '宿舍', ComputerLabScene: '机房', ResearchScene: '科研楼', TeacherOfficeScene: '教师办公室' };
        return map[sceneKey] || sceneKey;
    }

    // ============ 交友弹窗（直接场景对象，不用Container） ============
    _buildSocialPopup() {
        this._socialLocked = false;
        const W = 1024, H = 768;
        const popupX = W / 2, popupY = H / 2;
        const pw = 340, ph = 280;
        const d = 200; // depth
        const s = 0;   // scrollFactor

        // 背景遮罩（点击关闭区域外）
        const mask = this.add.rectangle(popupX, popupY, W, H, 0x000000, 0.3);
        mask.setScrollFactor(s).setDepth(d).setVisible(false).setInteractive();
        mask.on('pointerdown', (p) => {
            p.event.stopPropagation();
            this._socialLocked = true;
            this._hideSocialPopup();
            this.time.delayedCall(3000, () => { this._socialLocked = false; });
        });

        // 弹窗背景
        const bg = this.add.rectangle(popupX, popupY, pw, ph, 0x1a1a2e, 0.97);
        bg.setStrokeStyle(2, 0xffb74d);
        bg.setScrollFactor(s).setDepth(d + 1).setVisible(false);
        bg.setInteractive(); // 阻止点击穿透

        // 标题
        const title = this.add.text(popupX, popupY - 100, '👥 遇见了一位同学！', {
            fontSize: '20px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(s).setDepth(d + 2).setVisible(false);

        const divider = this.add.rectangle(popupX, popupY - 70, 280, 1, 0x444466);
        divider.setScrollFactor(s).setDepth(d + 2).setVisible(false);

        // 按钮组
        const btnEls = [];
        const actions = [
            { label: '🤝 加好友', y: popupY - 35 },
            { label: '👋 打招呼', y: popupY + 15 },
            { label: '💬 私聊', y: popupY + 65 },
        ];
        actions.forEach(a => {
            const btn = this.add.rectangle(popupX, a.y, 220, 36, 0x333366, 1);
            btn.setStrokeStyle(1, 0x555588);
            btn.setScrollFactor(s).setDepth(d + 2).setVisible(false);
            btn.setInteractive({ useHandCursor: true });
            btn.on('pointerover', () => btn.setFillStyle(0x444488));
            btn.on('pointerout', () => btn.setFillStyle(0x333366));
            btn.on('pointerdown', (p2) => {
                p2.event.stopPropagation();
                showHint(this, `${a.label} — 功能将在后续版本上线`, '#ffcc00');
            });
            btnEls.push(btn);

            const lbl = this.add.text(popupX, a.y, a.label, {
                fontSize: '16px', fill: '#ffffff'
            }).setOrigin(0.5).setScrollFactor(s).setDepth(d + 3).setVisible(false);
            btnEls.push(lbl);
        });

        // 关闭按钮
        const closeBg = this.add.rectangle(popupX, popupY + 115, 120, 28, 0x662222, 1);
        closeBg.setStrokeStyle(1, 0x883333);
        closeBg.setScrollFactor(s).setDepth(d + 2).setVisible(false);
        closeBg.setInteractive({ useHandCursor: true });
        closeBg.on('pointerover', () => closeBg.setFillStyle(0x883333));
        closeBg.on('pointerout', () => closeBg.setFillStyle(0x662222));
        closeBg.on('pointerdown', (p3) => {
            p3.event.stopPropagation();
            this._socialLocked = true;
            this._hideSocialPopup();
            this.time.delayedCall(3000, () => { this._socialLocked = false; });
        });

        const closeTxt = this.add.text(popupX, popupY + 115, '✕ 走开', {
            fontSize: '14px', fill: '#ff9999'
        }).setOrigin(0.5).setScrollFactor(s).setDepth(d + 3).setVisible(false);

        // 所有元素统一管理
        this.socialElements = [mask, bg, title, divider, ...btnEls, closeBg, closeTxt];
    }

    _showSocialPopup() {
        this.socialElements.forEach(el => el.setVisible(true));
    }

    _hideSocialPopup() {
        this.socialElements.forEach(el => el.setVisible(false));
    }
}