const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');

// Créer le répertoire data s'il n'existe pas
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Hasher les mots de passe
const passwordEmployee = bcrypt.hashSync('Employee123!', 10);
const passwordAdmin = bcrypt.hashSync('Admin123!', 10);
const passwordOwner = bcrypt.hashSync('Owner123!', 10);

// Créer la base de données initiale
const currentYear = new Date().getFullYear();
const todayIso = new Date().toISOString();

const database = {
  users: [
    {
      id: 1,
      email: 'employee@example.com',
      password_hash: passwordEmployee,
      full_name: 'Jean Employé',
      role: 'employee',
      department: 'Ventes',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      email: 'admin@example.com',
      password_hash: passwordAdmin,
      full_name: 'Marie Admin',
      role: 'hr_admin',
      department: 'RH',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      email: 'owner@example.com',
      password_hash: passwordOwner,
      full_name: 'Pierre Owner',
      role: 'owner',
      department: 'Direction',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      email: 'celine@example.com',
      password_hash: passwordEmployee,
      full_name: 'Céline Assistante',
      role: 'employee',
      department: 'Marketing',
      created_at: todayIso
    },
    {
      id: 5,
      email: 'samir@example.com',
      password_hash: passwordEmployee,
      full_name: 'Samir Technicien',
      role: 'employee',
      department: 'Support',
      created_at: todayIso
    }
  ],
  offers: [
    {
      id: 1,
      title: 'Séjour à Marrakech',
      description: 'Découvrez la ville rouge et ses souks authentiques',
      destination: 'Marrakech, Maroc',
      start_date: `${new Date().getFullYear()}-06-15`,
      end_date: `${new Date().getFullYear()}-06-22`,
      price: 1500,
      max_participants: 20,
      current_participants: 5,
      status: 'active',
      created_by: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Plage à Essaouira',
      description: 'Relaxation au bord de l\'Océan Atlantique',
      destination: 'Essaouira, Maroc',
      start_date: `${new Date().getFullYear()}-07-01`,
      end_date: `${new Date().getFullYear()}-07-08`,
      price: 1200,
      max_participants: 30,
      current_participants: 12,
      status: 'active',
      created_by: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Trek dans le Sahara',
      description: 'Aventure inoubliable dans le désert du Sahara',
      destination: 'Merzouga, Maroc',
      start_date: `${new Date().getFullYear()}-08-10`,
      end_date: `${new Date().getFullYear()}-08-17`,
      price: 1800,
      max_participants: 15,
      current_participants: 7,
      status: 'active',
      created_by: 2,
      created_at: new Date().toISOString()
    }
  ],
  requests: [
    {
      id: 1,
      user_id: 1,
      offer_id: null,
      type: 'leave',
      start_date: `${currentYear}-04-10`,
      end_date: `${currentYear}-04-14`,
      reason: 'Retraite équipe',
      status: 'En cours / En attente RH',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 4,
      offer_id: 1,
      type: 'offer',
      start_date: null,
      end_date: null,
      reason: 'Souhait de découvrir Marrakech',
      status: 'Acceptée',
      approved_by: 2,
      approval_date: new Date().toISOString(),
      approval_reason: 'Profil compatible',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 5,
      offer_id: 2,
      type: 'offer',
      start_date: null,
      end_date: null,
      reason: 'Besoin de repos',
      status: 'Refusée',
      approved_by: 2,
      approval_date: new Date().toISOString(),
      approval_reason: 'Quota dépassé',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      user_id: 1,
      offer_id: 3,
      type: 'offer',
      start_date: null,
      end_date: null,
      reason: 'Partir en trekking',
      status: 'Refus automatique',
      auto_rejection_reason: 'Vous avez déjà postulé à cette offre',
      created_at: new Date().toISOString()
    },
    {
      id: 5,
      user_id: 5,
      offer_id: null,
      type: 'leave',
      start_date: `${currentYear}-05-20`,
      end_date: `${currentYear}-05-24`,
      reason: 'Formation externe',
      status: 'En cours / En attente RH',
      created_at: new Date().toISOString()
    }
  ],
  leave_balances: [
    {
      id: 1,
      user_id: 1,
      annual_leave: 30,
      used_leave: 5,
      remaining_leave: 25,
      year: new Date().getFullYear(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 2,
      annual_leave: 30,
      used_leave: 0,
      remaining_leave: 30,
      year: new Date().getFullYear(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 3,
      annual_leave: 30,
      used_leave: 0,
      remaining_leave: 30,
      year: new Date().getFullYear(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      user_id: 4,
      annual_leave: 30,
      used_leave: 8,
      remaining_leave: 22,
      year: currentYear,
      updated_at: todayIso
    },
    {
      id: 5,
      user_id: 5,
      annual_leave: 30,
      used_leave: 3,
      remaining_leave: 27,
      year: currentYear,
      updated_at: todayIso
    }
  ],
  activity_logs: []
};

// Sauvegarder la base de données
fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf-8');

console.log('✅ Base de données créée avec succès à', dbPath);
console.log('\n📝 Utilisateurs de test:');
console.log('  - Email: employee@example.com, Mot de passe: Employee123!');
console.log('  - Email: admin@example.com, Mot de passe: Admin123!');
console.log('  - Email: owner@example.com, Mot de passe: Owner123!');
