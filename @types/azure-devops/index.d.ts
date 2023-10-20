export interface EventCreated {
  id: string;
  eventType: string;
  publisherId: string;
  message: Message;
  detailedMessage: Message;
  resource: Resource;
  createdDate: string;
}

export interface Message {
  text: string;
  html: string;
  markdown: string;
}

export interface Resource {
  commits?: any[];
  refUpdates?: any[];
  repository?: any;
  pushedBy?: {
    id: string;
    displayName: string;
    uniqueName: string;
    imageUrl: string;
    descriptor: string;
    url: string;
    _links: any;
  };
  pushId: number;
  date: string;
  url: string;
  _links: any;
}