import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDatabase, saveDatabase } from '@/lib/db';

export async function POST() {
  try {
    console.log('[v0] Initialisation de la base de données...');
    
    const database = await getDatabase();

    // Vérifier si la BD a déjà des données
    if (database.users.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Base de données déjà initialisée'
      });
    }

    // Hasher les mots de passe
    const passwordEmployee = bcrypt.hashSync('Employee123!', 10);
    const passwordAdmin = bcrypt.hashSync('Admin123!', 10);
    const passwordOwner = bcrypt.hashSync('Owner123!', 10);

    // Créer les utilisateurs
    const users = [
      {
        id: 1,
        email: 'employee@example.com',
        password_hash: passwordEmployee,
        full_name: 'Jean Employé',
        role: 'employee' as const,
        department: 'Ventes',
        status: 'active' as const,
        deactivated_at: null,
        deactivated_by: null,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        email: 'admin@example.com',
        password_hash: passwordAdmin,
        full_name: 'Marie Admin',
        role: 'hr_admin' as const,
        department: 'RH',
        status: 'active' as const,
        deactivated_at: null,
        deactivated_by: null,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        email: 'owner@example.com',
        password_hash: passwordOwner,
        full_name: 'Pierre Owner',
        role: 'owner' as const,
        department: 'Direction',
        status: 'active' as const,
        deactivated_at: null,
        deactivated_by: null,
        created_at: new Date().toISOString()
      }
    ];

    database.users = users;

    // Créer des soldes de congés
    const currentYear = new Date().getFullYear();
    database.leave_balances = [
      {
        id: 1,
        user_id: 1,
        annual_leave: 30,
        used_leave: 5,
        remaining_leave: 25,
        year: currentYear,
        days_worked: 0,
        calculated_leave: 0,
        manual_adjustment: 0,
        adjustment_reason: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 2,
        annual_leave: 30,
        used_leave: 0,
        remaining_leave: 30,
        year: currentYear,
        days_worked: 0,
        calculated_leave: 0,
        manual_adjustment: 0,
        adjustment_reason: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        user_id: 3,
        annual_leave: 30,
        used_leave: 0,
        remaining_leave: 30,
        year: currentYear,
        days_worked: 0,
        calculated_leave: 0,
        manual_adjustment: 0,
        adjustment_reason: null,
        updated_at: new Date().toISOString()
      }
    ];

    // Créer des offres de vacances
    database.offers = [
      {
        id: 1,
        title: 'Séjour à Marrakech',
        description: 'Découvrez la ville rouge et ses souks authentiques',
        destination: 'Marrakech, Maroc',
        start_date: `${currentYear}-06-15`,
        end_date: `${currentYear}-06-22`,
        duration: '7 jours / 6 nuits',
        price: 1500,
        max_participants: 20,
        current_participants: 5,
        application_deadline: `${currentYear}-06-01`,
        hotel_name: 'Hotel Marrakech Palace',
        conditions: 'Réservation non remboursable',
        images: [],
        status: 'Disponible',
        created_by: 2,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Plage à Essaouira',
        description: 'Relaxation au bord de l\'Océan Atlantique',
        destination: 'Essaouira, Maroc',
        start_date: `${currentYear}-07-01`,
        end_date: `${currentYear}-07-08`,
        duration: '7 jours / 6 nuits',
        price: 1200,
        max_participants: 30,
        current_participants: 12,
        application_deadline: `${currentYear}-06-15`,
        hotel_name: 'Hotel Atlas Essaouira',
        conditions: 'Petit-déjeuner inclus',
        images: [],
        status: 'Disponible',
        created_by: 2,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        title: 'Trek dans le Sahara',
        description: 'Aventure inoubliable dans le désert du Sahara',
        destination: 'Merzouga, Maroc',
        start_date: `${currentYear}-08-10`,
        end_date: `${currentYear}-08-17`,
        duration: '7 jours / 6 nuits',
        price: 1800,
        max_participants: 15,
        current_participants: 7,
        application_deadline: `${currentYear}-07-25`,
        hotel_name: 'Auberge Sahara Dreams',
        conditions: 'Guide professionnel inclus',
        images: [],
        status: 'Disponible',
        created_by: 2,
        created_at: new Date().toISOString()
      }
    ];

    saveDatabase();

    return NextResponse.json({
      success: true,
      message: 'Base de données initialisée avec succès',
      users: [
        { email: 'employee@example.com', password: 'Employee123!' },
        { email: 'admin@example.com', password: 'Admin123!' },
        { email: 'owner@example.com', password: 'Owner123!' }
      ]
    });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'initialisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
