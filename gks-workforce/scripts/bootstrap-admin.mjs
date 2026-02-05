import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// --- CONFIGURATION ---
// You can either fill these in or the script will try to read .env.local
const ADMIN_EMAIL = 'gksyerros@gmail.com'; // CHANGE THIS
const ADMIN_PASSWORD = 'gksyerros123#';    // CHANGE THIS
const ADMIN_NAME = 'Tony';         // CHANGE THIS
// ---------------------

async function bootstrap() {
    console.log('🚀 Starting Admin Bootstrap...');

    // 1. Load Env Vars from .env.local
    const envPath = join(process.cwd(), '.env.local');
    let envContent = '';
    try {
        envContent = readFileSync(envPath, 'utf8');
    } catch (e) {
        console.error('❌ Could not find .env.local file. Please ensure it exists in the root directory.');
        process.exit(1);
    }

    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim().replace(/['"]/g, '') : null;
    };

    const firebaseConfig = {
        apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
        authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
        projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
        storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID')
    };

    if (!firebaseConfig.apiKey) {
        console.error('❌ Missing Firebase configuration in .env.local');
        process.exit(1);
    }

    // 2. Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
        console.log(`Creating user: ${ADMIN_EMAIL}...`);

        // 3. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const uid = userCredential.user.uid;

        console.log(`✅ Auth user created with UID: ${uid}`);

        // 4. Create Firestore Document
        await setDoc(doc(db, 'users', uid), {
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            role: 'ADMIN',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Firestore record created with ADMIN role!');
        console.log('\n🎉 DONE! You can now log in with these credentials.');

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('ℹ️ Auth user already exists. Attempting to update Firestore role...');
            // If user exists, we'd need their UID. This script is for NEW users.
            // For existing users, you'd need to manually edit Firestore as per previous instructions.
            console.error('❌ Error: User already exists in Auth. Please use a different email or follow the manual Firestore steps.');
        } else {
            console.error('❌ Error bootstrapping admin:', error.message);
        }
    }
}

bootstrap();
