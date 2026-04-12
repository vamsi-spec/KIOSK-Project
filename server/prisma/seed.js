import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SUVIDHA database...')

  // ── Clean existing seed data ─────────────────────────────
  // Order matters — delete dependents before parents
  await prisma.kioskLog.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.bill.deleteMany()
  await prisma.complaint.deleteMany()
  await prisma.newConnectionRequest.deleteMany()
  await prisma.serviceAccount.deleteMany()
  await prisma.session.deleteMany()
  await prisma.citizen.deleteMany()
  await prisma.admin.deleteMany()

  console.log('  ✓ Cleared existing data')

  // ── Seed Admins ──────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('Admin@123', 10)
  const operatorHash   = await bcrypt.hash('Operator@123', 10)

  const [superAdmin, operator] = await Promise.all([
    prisma.admin.create({
      data: {
        username:     'super_admin',
        passwordHash: superAdminHash,
        role:         'SUPER_ADMIN'
      }
    }),
    prisma.admin.create({
      data: {
        username:     'hyd_operator',
        passwordHash: operatorHash,
        role:         'OPERATOR'
      }
    })
  ])
  console.log('  ✓ Created 2 admin accounts')
  console.log('    super_admin  / Admin@123    (SUPER_ADMIN)')
  console.log('    hyd_operator / Operator@123 (OPERATOR)')

  // ── Seed Citizens ────────────────────────────────────────
  const [ravi, priya, suresh] = await Promise.all([
    prisma.citizen.create({
      data: {
        name:          'Ravi Kumar',
        mobile:        '9876543210',
        aadhaarHash:   'abc123hash_ravi',
        isVerified:    true,
        preferredLang: 'te'
      }
    }),
    prisma.citizen.create({
      data: {
        name:          'Priya Sharma',
        mobile:        '9876543211',
        aadhaarHash:   'abc123hash_priya',
        isVerified:    true,
        preferredLang: 'hi'
      }
    }),
    prisma.citizen.create({
      data: {
        name:          'Suresh Reddy',
        mobile:        '9876543212',
        aadhaarHash:   'abc123hash_suresh',
        isVerified:    true,
        preferredLang: 'en'
      }
    })
  ])
  console.log('  ✓ Created 3 citizens')

  // ── Seed Provider Configs ────────────────────────────────
  await prisma.providerConfig.createMany({
    data: [
      {
        providerName:        'TSSPDCL',
        serviceType:         'ELECTRICITY',
        lateFeeRatePerMonth: 0.0150,
        lateFeGraceDays:     0,
        lateFeeCap:          0.50,
        paymentTimeoutMin:   15
      },
      {
        providerName:        'Hyderabad Gas Ltd',
        serviceType:         'GAS',
        lateFeeRatePerMonth: 0.0200,
        lateFeGraceDays:     5,
        lateFeeCap:          0.30,
        paymentTimeoutMin:   15
      },
      {
        providerName:        'HMWSSB',
        serviceType:         'WATER',
        lateFeeRatePerMonth: 0.0100,
        lateFeGraceDays:     7,
        lateFeeCap:          0.25,
        paymentTimeoutMin:   15
      }
    ],
    skipDuplicates: true
  })
  console.log('  ✓ Created provider configs')

  // ── Seed Service Accounts ────────────────────────────────
  const [raviElec, raviGas, raviWater, priyaElec, sureshElec] = await Promise.all([
    prisma.serviceAccount.create({
      data: {
        citizenId:    ravi.id,
        serviceType:  'ELECTRICITY',
        accountNo:    '7845-321-09',
        providerName: 'TSSPDCL',
        address:      'Flat 4B, Green Valley Apartments, Madhapur, Hyderabad',
        registeredMobile: '9876543210'
      }
    }),
    prisma.serviceAccount.create({
      data: {
        citizenId:    ravi.id,
        serviceType:  'GAS',
        accountNo:    'GAS-HYD-44521',
        providerName: 'Hyderabad Gas Ltd',
        address:      'Flat 4B, Green Valley Apartments, Madhapur, Hyderabad',
        registeredMobile: '9876543210'
      }
    }),
    prisma.serviceAccount.create({
      data: {
        citizenId:    ravi.id,
        serviceType:  'WATER',
        accountNo:    'HMWSSB-78234',
        providerName: 'HMWSSB',
        address:      'Flat 4B, Green Valley Apartments, Madhapur, Hyderabad',
        registeredMobile: '9876543210'
      }
    }),
    prisma.serviceAccount.create({
      data: {
        citizenId:    priya.id,
        serviceType:  'ELECTRICITY',
        accountNo:    '7845-321-77',
        providerName: 'TSSPDCL',
        address:      '22, Banjara Hills Road No. 12, Hyderabad',
        registeredMobile: '9876543211'
      }
    }),
    prisma.serviceAccount.create({
      data: {
        citizenId:    suresh.id,
        serviceType:  'ELECTRICITY',
        accountNo:    '7845-900-31',
        providerName: 'TSSPDCL',
        address:      'Plot 8, KPHB Colony, Kukatpally, Hyderabad',
        registeredMobile: '9876543212'
      }
    })
  ])
  console.log('  ✓ Created 5 service accounts')

  // ── Seed Bills ───────────────────────────────────────────
  const now       = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15)
  const overdue   = new Date(now.getFullYear(), now.getMonth() - 1, 10)

  await Promise.all([
    // Ravi — electricity bill due next month (PENDING)
    prisma.bill.create({
      data: {
        accountId:      raviElec.id,
        billNo:         'EB2025110034',
        amount:         1847.00,
        dueDate:        nextMonth,
        period:         'Nov 2025',
        unitsConsumed:  284,
        status:         'PENDING'
      }
    }),
    // Ravi — gas bill (PENDING)
    prisma.bill.create({
      data: {
        accountId:      raviGas.id,
        billNo:         'GAS2025110021',
        amount:         643.50,
        dueDate:        nextMonth,
        period:         'Nov 2025',
        unitsConsumed:  12.4,
        status:         'PENDING'
      }
    }),
    // Ravi — water bill (OVERDUE — good for testing overdue UI)
    prisma.bill.create({
      data: {
        accountId:      raviWater.id,
        billNo:         'WATER2025100009',
        amount:         320.00,
        dueDate:        overdue,
        period:         'Oct 2025',
        unitsConsumed:  8.2,
        status:         'OVERDUE'
      }
    }),
    // Priya — electricity bill already paid
    prisma.bill.create({
      data: {
        accountId:      priyaElec.id,
        billNo:         'EB2025110089',
        amount:         2210.00,
        dueDate:        nextMonth,
        period:         'Nov 2025',
        unitsConsumed:  340,
        status:         'PAID'
      }
    }),
    // Suresh — electricity bill pending
    prisma.bill.create({
      data: {
        accountId:      sureshElec.id,
        billNo:         'EB2025110112',
        amount:         1125.75,
        dueDate:        nextMonth,
        period:         'Nov 2025',
        unitsConsumed:  173,
        status:         'PENDING'
      }
    })
  ])
  console.log('  ✓ Created 5 bills (2 pending, 1 overdue, 1 paid, 1 pending)')

  // ── Seed Complaints ──────────────────────────────────────
  await Promise.all([
    prisma.complaint.create({
      data: {
        citizenId:   ravi.id,
        serviceType: 'ELECTRICITY',
        category:    'Power outage',
        description: 'No electricity supply for the past 6 hours in the entire building. Emergency request.',
        status:      'IN_PROGRESS',
        assignedTo:  'TSSPDCL_Field_Team_4',
        refNo:       'COMP-2025-00001'
      }
    }),
    prisma.complaint.create({
      data: {
        citizenId:   priya.id,
        serviceType: 'WATER',
        category:    'Low pressure',
        description: 'Water pressure has been very low for the past 3 days. Cannot fill overhead tank.',
        status:      'SUBMITTED',
        refNo:       'COMP-2025-00002'
      }
    }),
    prisma.complaint.create({
      data: {
        citizenId:   ravi.id,
        serviceType: 'GAS',
        category:    'Meter fault',
        description: 'Gas meter is not showing correct readings. Suspected meter malfunction.',
        status:      'RESOLVED',
        assignedTo:  'Gas_Inspection_Team',
        resolutionNote: 'Meter replaced on 05 Dec 2025. New meter reading starts from 0.',
        refNo:       'COMP-2025-00003',
        resolvedAt:  new Date('2025-12-05')
      }
    })
  ])
  console.log('  ✓ Created 3 complaints (1 in progress, 1 submitted, 1 resolved)')

  // ── Seed New Connection Requests ─────────────────────────
  await prisma.newConnectionRequest.create({
    data: {
      citizenId:    suresh.id,
      serviceType:  'GAS',
      address:      'Plot 8, KPHB Colony, Kukatpally, Hyderabad',
      propertyType: 'RESIDENTIAL',
      status:       'UNDER_REVIEW',
      refNo:        'CONN-2025-00001'
    }
  })
  console.log('  ✓ Created 1 connection request')

  // ── Seed KioskLogs (sample usage data for analytics) ────
  const sampleActions = [
    { kioskId: 'KIOSK_001', citizenId: ravi.id,   action: 'LANGUAGE_SELECTED',   serviceType: null,          metadata: { lang: 'te' } },
    { kioskId: 'KIOSK_001', citizenId: ravi.id,   action: 'LOGIN_SUCCESS',        serviceType: null,          metadata: {} },
    { kioskId: 'KIOSK_001', citizenId: ravi.id,   action: 'SERVICE_SELECTED',     serviceType: 'ELECTRICITY', metadata: { screen: 'electricity_home' } },
    { kioskId: 'KIOSK_001', citizenId: ravi.id,   action: 'BILL_VIEWED',          serviceType: 'ELECTRICITY', metadata: { billNo: 'EB2025110034', amount: 1847 } },
    { kioskId: 'KIOSK_001', citizenId: ravi.id,   action: 'PAYMENT_INITIATED',    serviceType: 'ELECTRICITY', metadata: { amount: 1847 } },
    { kioskId: 'KIOSK_002', citizenId: priya.id,  action: 'LANGUAGE_SELECTED',   serviceType: null,          metadata: { lang: 'hi' } },
    { kioskId: 'KIOSK_002', citizenId: priya.id,  action: 'LOGIN_SUCCESS',        serviceType: null,          metadata: {} },
    { kioskId: 'KIOSK_002', citizenId: priya.id,  action: 'SERVICE_SELECTED',     serviceType: 'WATER',       metadata: { screen: 'water_home' } },
    { kioskId: 'KIOSK_003', citizenId: null,       action: 'LANGUAGE_SELECTED',   serviceType: null,          metadata: { lang: 'en' } },
    { kioskId: 'KIOSK_003', citizenId: null,       action: 'SESSION_TIMEOUT',     serviceType: null,          metadata: { idleDuration: 60 } },
  ]

  await Promise.all(
    sampleActions.map(log =>
      prisma.kioskLog.create({ data: log })
    )
  )
  console.log('  ✓ Created 10 kiosk log entries')

  // ── Summary ──────────────────────────────────────────────
  console.log('\n✅ Seed complete!')
  console.log('━'.repeat(50))
  console.log('Test login credentials:')
  console.log('  Citizen mobile: 9876543210 (Ravi Kumar — Telugu)')
  console.log('  Citizen mobile: 9876543211 (Priya Sharma — Hindi)')
  console.log('  Admin login:    super_admin / Admin@123')
  console.log('  Admin login:    hyd_operator / Operator@123')
  console.log('━'.repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
