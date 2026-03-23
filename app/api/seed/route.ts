import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDrizzleDb } from '@/lib/db/index';
import { saveDatabase as persistDatabase } from '@/lib/db/index';
import { ensureDatabaseSeeded } from '@/lib/db/bootstrap';
import { users, offers, requests, leaveBalances, activityLogs, systemSettings, type User } from '@/lib/db/schema';

export async function POST() {
  try {
    console.log('[Seed] Adding more data to database...');

    const initResult = await ensureDatabaseSeeded();
    const db = await getDrizzleDb();
    const currentYear = new Date().getFullYear();
    const passwordEmployee = bcrypt.hashSync('Employee123!', 10);
    
    // Get existing users to use as reference
    const existingUsers = await db.select().from(users);
    let hrAdmin = existingUsers.find((u: User) => u.role === 'hr_admin');
    const owner = existingUsers.find((u: User) => u.role === 'owner');
    
    // Create more HR admins (skip if email already exists)
    const hrAdmins = [
      { email: 'rh.director@example.com', full_name: 'Claire Director', department: 'RH' },
      { email: 'rh.manager@example.com', full_name: 'Bernard Manager', department: 'RH' },
      { email: 'recruiter@example.com', full_name: 'Annie Recruiter', department: 'Recrutement' },
      { email: 'hr.specialist@example.com', full_name: 'Samuel Specialist', department: 'RH' },
    ];
    
    let hrAdminsAdded = 0;
    for (const admin of hrAdmins) {
      const existing = existingUsers.find((u: User) => u.email === admin.email);
      if (!existing) {
        await db.insert(users).values({
          email: admin.email,
          password_hash: bcrypt.hashSync('Admin123!', 10),
          full_name: admin.full_name,
          role: 'hr_admin' as const,
          department: admin.department,
          status: 'active' as const,
          deactivated_at: null,
          deactivated_by: null,
          created_at: new Date().toISOString(),
        });
        hrAdminsAdded++;
      }
    }
    
    // Refresh hrAdmin reference if needed
    if (!hrAdmin) {
      const allUsers = await db.select().from(users);
      hrAdmin = allUsers.find((u: User) => u.role === 'hr_admin');
    }
    
    if (!hrAdmin || !owner) {
      return NextResponse.json({
        success: false,
        message: 'Please initialize the database first'
      }, { status: 400 });
    }

    // Create more employees (skip if email already exists)
    const newEmployees = [
      { email: 'sophie.martin@example.com', full_name: 'Sophie Martin', department: 'Marketing' },
      { email: 'luc.durand@example.com', full_name: 'Luc Durand', department: 'Ventes' },
      { email: 'emma.wilson@example.com', full_name: 'Emma Wilson', department: 'Informatique' },
      { email: 'marie.laurent@example.com', full_name: 'Marie Laurent', department: 'Comptabilité' },
      { email: 'paul.dubois@example.com', full_name: 'Paul Dubois', department: 'Marketing' },
      { email: 'julia.bernard@example.com', full_name: 'Julia Bernard', department: 'Ventes' },
      { email: 'antoine.moreau@example.com', full_name: 'Antoine Moreau', department: 'RH' },
      { email: 'camille.germain@example.com', full_name: 'Camille Germain', department: 'Informatique' },
    ];

    const employeeIds: number[] = [];
    let employeesAdded = 0;

    for (const emp of newEmployees) {
      const existing = existingUsers.find((u: User) => u.email === emp.email);
      if (existing) {
        employeeIds.push(existing.id);
        continue;
      }
      const result = await db.insert(users).values({
        email: emp.email,
        password_hash: passwordEmployee,
        full_name: emp.full_name,
        role: 'employee' as const,
        department: emp.department,
        status: 'active' as const,
        deactivated_at: null,
        deactivated_by: null,
        created_at: new Date().toISOString(),
      });
      const newId = Number(result.lastInsertRowid);
      employeeIds.push(newId);
      employeesAdded++;
      
      // Create leave balance for each new employee
      await db.insert(leaveBalances).values({
        user_id: newId,
        annual_leave: 30,
        used_leave: Math.floor(Math.random() * 15),
        remaining_leave: 15 + Math.floor(Math.random() * 15),
        year: currentYear,
        days_worked: Math.floor(Math.random() * 200),
        calculated_leave: Math.floor(Math.random() * 15),
        manual_adjustment: 0,
        adjustment_reason: null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Get existing offers to avoid duplicates
    const existingOffers = await db.select().from(offers);
    const existingOfferTitles = new Set(existingOffers.map((o: any) => o.title));
    
    // Create more offers (skip if title already exists)
    const newOffers = [
      {
        title: 'Circuit dans le Sud du Maroc',
        description: 'Découvrez les merveilles du sud marocain',
        destination: 'Ouarzazate, Maroc',
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear}-09-08`,
        duration: '7 jours / 6 nuits',
        price: 2200,
        max_participants: 12,
        current_participants: 4,
        application_deadline: `${currentYear}-08-15`,
        hotel_name: 'Riad Berbère',
        conditions: 'Guide inclus',
        status: 'Disponible' as const,
        created_by: hrAdmin.id,
      },
      {
        title: 'Week-end à Tanger',
        description: 'Escape culturelle à Tanger',
        destination: 'Tanger, Maroc',
        start_date: `${currentYear}-10-15`,
        end_date: `${currentYear}-10-17`,
        duration: '2 jours / 1 nuit',
        price: 800,
        max_participants: 25,
        current_participants: 18,
        application_deadline: `${currentYear}-10-01`,
        hotel_name: 'Hotel Tanger',
        conditions: 'Petit-déjeuner inclus',
        status: 'Disponible' as const,
        created_by: hrAdmin.id,
      },
      {
        title: 'Séjour thermal à Safi',
        description: 'Détente et bien-être',
        destination: 'Safi, Maroc',
        start_date: `${currentYear}-11-05`,
        end_date: `${currentYear}-11-12`,
        duration: '7 jours / 6 nuits',
        price: 1400,
        max_participants: 20,
        current_participants: 20,
        application_deadline: `${currentYear}-10-20`,
        hotel_name: 'Safi Thermal Resort',
        conditions: 'Cures thermales incluses',
        status: 'Complet' as const,
        created_by: hrAdmin.id,
      },
      {
        title: 'Aventure dans l\'Atlas',
        description: 'Randonnée et découverte berbère',
        destination: 'Imlil, Maroc',
        start_date: `${currentYear}-06-20`,
        end_date: `${currentYear}-06-25`,
        duration: '5 jours / 4 nuits',
        price: 1600,
        max_participants: 10,
        current_participants: 3,
        application_deadline: `${currentYear}-06-05`,
        hotel_name: 'Mountain Refuge',
        conditions: 'Guide de montagne',
        status: 'Disponible' as const,
        created_by: hrAdmin.id,
      },
      {
        title: 'Vacances à Agadir',
        description: ' Soleil et plage',
        destination: 'Agadir, Maroc',
        start_date: `${currentYear}-08-01`,
        end_date: `${currentYear}-08-08`,
        duration: '7 jours / 6 nuits',
        price: 1300,
        max_participants: 30,
        current_participants: 0,
        application_deadline: `${currentYear}-07-15`,
        hotel_name: 'Agadir Bay Resort',
        conditions: 'All Inclusive',
        status: 'Disponible' as const,
        created_by: hrAdmin.id,
      },
    ];

    const offerIds: number[] = [];
    let offersAdded = 0;
    for (const offer of newOffers) {
      if (existingOfferTitles.has(offer.title)) {
        const existingOffer = existingOffers.find((o: any) => o.title === offer.title);
        if (existingOffer) offerIds.push(existingOffer.id);
        continue;
      }
      const result = await db.insert(offers).values({
        ...offer,
        images: [],
        created_at: new Date().toISOString(),
      });
      offerIds.push(Number(result.lastInsertRowid));
      offersAdded++;
    }

    // Create requests (mix of offer and leave requests)
    const requestStatuses = [
      'En cours / En attente RH',
      'Acceptée',
      'Refusée',
      'En cours / En attente RH',
    ];

    const leaveReasons = [
      'Vacances familiales',
      'Motif personnel',
      'Déménagement',
      'Rendez-vous médical',
      'Formation',
    ];

    // Create requests for employees
    let requestsAdded = 0;
    for (let i = 0; i < employeeIds.length; i++) {
      const empId = employeeIds[i];
      
      // Offer request
      if (offerIds.length > 0 && Math.random() > 0.3) {
        const offerIdx = Math.floor(Math.random() * Math.min(offerIds.length, 3)); // Prefer available offers
        await db.insert(requests).values({
          user_id: empId,
          offer_id: offerIds[offerIdx],
          type: 'offer' as const,
          start_date: null,
          end_date: null,
          selected_start_date: `${currentYear}-0${Math.floor(Math.random() * 6) + 6}-15`,
          selected_end_date: `${currentYear}-0${Math.floor(Math.random() * 6) + 6}-22`,
          reason: 'Intéressé par cette offre',
          status: requestStatuses[Math.floor(Math.random() * requestStatuses.length)] as any,
          approved_by: hrAdmin.id,
          approval_date: new Date().toISOString(),
          approval_reason: null,
          auto_rejection_reason: null,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        requestsAdded++;
      }
      
      // Leave request
      if (Math.random() > 0.4) {
        await db.insert(requests).values({
          user_id: empId,
          offer_id: null,
          type: 'leave' as const,
          start_date: `${currentYear}-0${Math.floor(Math.random() * 6) + 1}-${Math.floor(Math.random() * 28) + 1}`,
          end_date: `${currentYear}-0${Math.floor(Math.random() * 6) + 1}-${Math.floor(Math.random() * 28) + 1}`,
          selected_start_date: null,
          selected_end_date: null,
          reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
          status: requestStatuses[Math.floor(Math.random() * requestStatuses.length)] as any,
          approved_by: hrAdmin.id,
          approval_date: new Date().toISOString(),
          approval_reason: null,
          auto_rejection_reason: null,
          created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        });
        requestsAdded++;
      }
    }

    // Create activity logs
    const actions = [
      { action: 'login', resource_type: 'session', details: 'Connexion à l\'application' },
      { action: 'view_dashboard', resource_type: 'page', details: 'Consultation du tableau de bord' },
      { action: 'create_request', resource_type: 'request', details: 'Soumission d\'une demande' },
      { action: 'view_offers', resource_type: 'page', details: 'Consultation des offres' },
      { action: 'update_profile', resource_type: 'user', details: 'Mise à jour du profil' },
      { action: 'view_leave_balance', resource_type: 'page', details: 'Consultation du solde de congés' },
    ];

    const allUserIds = [...employeeIds, hrAdmin.id, owner.id];
    
    let activityLogsAdded = 0;
    for (let i = 0; i < 50; i++) {
      const randomUserId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      await db.insert(activityLogs).values({
        user_id: randomUserId,
        action: randomAction.action,
        resource_type: randomAction.resource_type,
        resource_id: null,
        details: randomAction.details,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0',
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      activityLogsAdded++;
    }

    // Get existing settings to avoid duplicates
    const existingSettings = await db.select().from(systemSettings);
    const existingSettingsKeys = new Set(existingSettings.map((s: any) => s.key));
    
    // Create system settings (skip if already exists)
    const settings = [
      { key: 'company_name', value: 'Fenie Brossette', description: 'Nom de l\'entreprise' },
      { key: 'leave_annual_default', value: '30', description: 'Nombre de jours de congés par défaut' },
      { key: 'leave_request_notifications', value: 'true', description: 'Notifications pour les demandes de congés' },
      { key: 'offer_notifications', value: 'true', description: 'Notifications pour les nouvelles offres' },
      { key: 'max_leave_days_per_request', value: '30', description: 'Nombre maximum de jours par demande' },
    ];

    let settingsAdded = 0;
    for (const setting of settings) {
      if (!existingSettingsKeys.has(setting.key)) {
        await db.insert(systemSettings).values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updated_at: new Date().toISOString(),
          updated_by: owner.id,
          created_at: new Date().toISOString(),
        });
        settingsAdded++;
      }
    }

    await persistDatabase();

    return NextResponse.json({
      success: true,
      message: initResult.seededNow
        ? 'Base de donnees initialisee et enrichie avec des donnees de demo'
        : 'Donnees de demo ajoutees a la base',
      users: [
        { email: 'employee@example.com', password: 'Employee123!' },
        { email: 'admin@example.com', password: 'Admin123!' },
        { email: 'owner@example.com', password: 'Owner123!' }
      ],
      added: {
        hr_admins: hrAdminsAdded,
        employees: employeesAdded,
        offers: offersAdded,
        requests: requestsAdded,
        activity_logs: activityLogsAdded,
        system_settings: settingsAdded,
      }
    });
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    return NextResponse.json(
      { error: 'Error seeding database: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
