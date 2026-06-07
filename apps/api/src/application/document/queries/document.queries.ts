export class GetUserDocumentsQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}

export class GetDocumentByIdQuery {
  constructor(
    public readonly documentId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}