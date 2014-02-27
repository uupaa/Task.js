export declare class Task {
    static name: string;
    static repository: string;
    public _taskName: string;
    public _tick: Function;
    public _buffer: any[];
    public _callback: any;
    public _junction: boolean;
    public _taskCount: number;
    public _missableCount: number;
    public _passedCount: number;
    public _missedCount: number;
    public _message: string;
    public _state: string;
    constructor(taskCount: number, callback: Function, options: TaskOptions);
    constructor(taskCount: number, callback: Task, options: TaskOptions);
    public push(value: any): Task;
    public set(key: string, value: any): Task;
    public done(err: Error): Task;
    public pass(): Task;
    public miss(): Task;
    public exit(): Task;
    private update(method);
    private judgeState();
    public buffer(): any[];
    public extend(count: number): Task;
    public message(msg: string): Task;
    public message(msg: Error): Task;
    public missable(count: number): Task;
    public isFinished(): boolean;
    static dump(filter: any): Object;
    static drop(): void;
    static flatten(source: any): any[];
    static arraynize(source: any): any[];
    static objectize(source: any): Object;
    static run(taskRoute: string, taskMap: Function[], callback: Task, options: Object): any;
    static run(taskRoute: string, taskMap: Object, callback: Task, options: Object): any;
    static run(taskRoute: string, taskMap: Function[], callback: Function, options: Object): any;
    static run(taskRoute: string, taskMap: Object, callback: Function, options: Object): any;
    static nextGroup(param: any): void;
    static callUserTask(param: any, taskName: string, junc: Task, singleTask: boolean): void;
}
export interface TaskOptions {
    tick?: Function;
    name?: string;
    buffer?: any;
}
