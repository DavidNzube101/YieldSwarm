export interface IOrchestrator {
  list(): Promise<any>;
  create(data: any): Promise<any>;
  get(id: string): Promise<any>;
  start(id: string): Promise<any>;
  stop(id: string): Promise<any>;
  delete(id: string): Promise<any>;
}
