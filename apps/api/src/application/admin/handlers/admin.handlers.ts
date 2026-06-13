import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GetAdminStatsQuery, GetAllUsersQuery, GetAllFilingsQuery } from '../queries/admin.queries';
import { UserSchemaClass, UserDocument } from '../../../infrastructure/database/schemas/user.schema';
import { DocumentSchemaClass, DocumentDocument } from '../../../infrastructure/database/schemas/document.schema';
import { TaxRecordSchemaClass, TaxRecordDocument } from '../../../infrastructure/database/schemas/tax-record.schema';
import { FilingSchemaClass, FilingDocument } from '../../../infrastructure/database/schemas/filing.schema';
import { FILING_STATUS, DOCUMENT_STATUS } from '@taxai/shared';
import { AdminStatsResponse } from '../dtos/admin-stats.dto'


@QueryHandler(GetAdminStatsQuery)
export class GetAdminStatsHandler implements IQueryHandler<GetAdminStatsQuery, AdminStatsResponse> {
  constructor(
    @InjectModel(UserSchemaClass.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DocumentSchemaClass.name) private readonly docModel: Model<DocumentDocument>,
    @InjectModel(TaxRecordSchemaClass.name) private readonly taxModel: Model<TaxRecordDocument>,
    @InjectModel(FilingSchemaClass.name) private readonly filingModel: Model<FilingDocument>,
  ) {}

  async execute(query: GetAdminStatsQuery): Promise<AdminStatsResponse> {
    const [
      totalUsers,
      totalDocuments,
      totalTaxCalculations,
      filingsByStatus,
      documentsByStatus,
      recentUsers,
    ] = await Promise.all([
      this.userModel.countDocuments({}),
      this.docModel.countDocuments({}),
      this.taxModel.countDocuments({}),

      // Filing counts grouped by status
      this.filingModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Document counts grouped by status
      this.docModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Last 5 registered users
      this.userModel
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('email firstName lastName role createdAt')
        .lean(),
    ]);

    // Reshape aggregation results into clean maps
    const filingsMap = filingsByStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const docsMap = documentsByStatus.reduce((acc: Record<string, number>, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      users: {
        total: totalUsers,
        recentRegistrations: recentUsers,
      },
      documents: {
        total: totalDocuments,
        pending: docsMap[DOCUMENT_STATUS.PENDING] ?? 0,
        processing: docsMap[DOCUMENT_STATUS.PROCESSING] ?? 0,
        extracted: docsMap[DOCUMENT_STATUS.EXTRACTED] ?? 0,
        failed: docsMap[DOCUMENT_STATUS.FAILED] ?? 0,
      },
      taxCalculations: {
        total: totalTaxCalculations,
      },
      filings: {
        total: Object.values(filingsMap).reduce((s: number, v: number) => s + v, 0),
        byStatus: {
          draft: filingsMap[FILING_STATUS.DRAFT] ?? 0,
          aiPrepared: filingsMap[FILING_STATUS.AI_PREPARED] ?? 0,
          caReview: filingsMap[FILING_STATUS.CA_REVIEW] ?? 0,
          userApproved: filingsMap[FILING_STATUS.USER_APPROVED] ?? 0,
          readyToFile: filingsMap[FILING_STATUS.READY_TO_FILE] ?? 0,
        },
      },
    };
  }
}

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersHandler implements IQueryHandler<GetAllUsersQuery> {
  constructor(
    @InjectModel(UserSchemaClass.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async execute(query: GetAllUsersQuery): Promise<Record<string, unknown>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash -refreshTokenHash')
        .lean(),
      this.userModel.countDocuments({}),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }
}

@QueryHandler(GetAllFilingsQuery)
export class GetAllFilingsHandler implements IQueryHandler<GetAllFilingsQuery> {
  constructor(
    @InjectModel(FilingSchemaClass.name) private readonly filingModel: Model<FilingDocument>,
  ) {}

  async execute(query: GetAllFilingsQuery): Promise<Record<string, any>> {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;

    const [filings, total] = await Promise.all([
      this.filingModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      this.filingModel.countDocuments(filter),
    ]);

    return {
      data: filings,
      meta: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }
}