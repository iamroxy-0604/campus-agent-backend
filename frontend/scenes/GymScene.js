import { SubSceneBase } from './SubSceneBase.js';
import { gymDialogDB } from '../utils/dialogData.js';

export class GymScene extends SubSceneBase {
    constructor() {
        super('GymScene', 'bg_gym_new', 'npc_gymren', { x: 800, y: 400 }, gymDialogDB, 'gym_admin');
    }
}