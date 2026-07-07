import { SubSceneBase } from './SubSceneBase.js';
import { mcdDialogDB } from '../utils/dialogData.js';

export class McDonaldScene extends SubSceneBase {
    constructor() {
        super('McDonaldScene', 'bg_mc', 'npc_mcdown', { x: 800, y: 400 }, mcdDialogDB, 'mcd_manager');
    }
}