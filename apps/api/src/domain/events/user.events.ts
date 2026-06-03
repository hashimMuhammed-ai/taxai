import { randomUUID } from 'crypto';

// Base Event
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly version = 1;

  constructor() {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}

// User Events
export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly tenantId: string,
    public readonly role: string,
  ) {
    super();
  }
}

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly ipAddress: string,
    public readonly tenantId: string,
  ) {
    super();
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {
    super();
  }
}