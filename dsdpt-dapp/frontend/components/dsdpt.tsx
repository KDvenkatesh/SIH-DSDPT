import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from 'three';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';


// Mock data and constants
const DSDPT_MODULE_ADDRESS = "0x123456789ABCDEF123456789ABCDEF";
const DSDPT_MODULE_NAME = "ScholarshipDistributor";

// Define a type for the Applicant data
interface Applicant {
	student: string;
	ipfs_cid: string;
	verified: boolean;
	allocated: number;
	claimed: boolean;
}

// Define the types for component props
interface HeaderProps {
	connected: boolean;
	connect: () => void;
	disconnect: () => void;
	onPageChange: (page: string) => void;
	currentPage: string;
}

interface SectionCardProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

interface InputFieldProps {
	label: string;
	type?: string;
	value: string | number;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	placeholder: string;
}

interface ButtonProps {
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
	className?: string;
}

interface StudentSectionProps {
	aptos: any;
	account: { address: string } | null;
	db: any;
	userId: string;
	appId: string;
}

interface OwnerSectionProps {
	aptos: any;
	account: { address: string } | null;
	db: any;
	userId: string;
	appId: string;
}

interface ProfileSectionProps {
	account: { address: string } | null;
	userId: string;
}

// 3D Globe Component
const Globe = () => {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		// Set up scene, camera, and renderer
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
		renderer.setSize(200, 200);
		mountRef.current.appendChild(renderer.domElement);
    
		// Create globe geometry
		const geometry = new THREE.SphereGeometry(25, 32, 32);
		const material = new THREE.MeshPhongMaterial({
			color: 0x4A90E2,
			shininess: 50,
			specular: 0x58ccff
		});
    
		const globe = new THREE.Mesh(geometry, material);
		scene.add(globe);

		// Add lighting
		const light = new THREE.AmbientLight(0x404040, 2);
		scene.add(light);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(50, 50, 50).normalize();
		scene.add(directionalLight);

		camera.position.z = 50;

		// Animation loop
		const animate = () => {
			requestAnimationFrame(animate);
			globe.rotation.y += 0.005;
			renderer.render(scene, camera);
		};

		animate();

		return () => {
			if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
				mountRef.current.removeChild(renderer.domElement);
			}
		};
	}, []);

	return <div ref={mountRef} className="h-48 w-48 flex items-center justify-center"></div>;
};

// Animation variants
const containerVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
	hidden: { y: 20, opacity: 0 },
	visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

const messageVariants = {
	hidden: { opacity: 0, y: -20 },
	visible: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: 20 },
};

const Header: React.FC<HeaderProps> = ({ connected, connect, disconnect, onPageChange, currentPage }) => (
	<motion.header
		initial={{ y: -100, opacity: 0 }}
		animate={{ y: 0, opacity: 1 }}
		transition={{ duration: 0.8, ease: "easeOut" }}
		className="fixed top-0 left-0 w-full z-10 bg-white/70 backdrop-blur-lg shadow-sm p-4"
	>
		<div className="container mx-auto flex justify-between items-center">
			<h1 className="text-2xl font-bold text-gray-800 tracking-wider cursor-pointer" onClick={() => onPageChange('home')}>DSDPT</h1>
			<nav className="hidden md:flex space-x-8 text-gray-600 font-medium">
				<a
					href="#"
					onClick={() => onPageChange('dashboard')}
					className={`hover:text-blue-600 transition-colors ${currentPage === 'dashboard' ? 'text-blue-600 font-bold' : ''}`}
				>Dashboard</a>
				<a
					href="#"
					onClick={() => onPageChange('about')}
					className={`hover:text-blue-600 transition-colors ${currentPage === 'about' ? 'text-blue-600 font-bold' : ''}`}
				>About</a>
				<a
					href="#"
					onClick={() => onPageChange('contact')}
					className={`hover:text-blue-600 transition-colors ${currentPage === 'contact' ? 'text-blue-600 font-bold' : ''}`}
				>Contact</a>
			</nav>
			<AnimatePresence mode="wait">
				{connected ? (
					<motion.div
						key="connected-state"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						className="flex items-center space-x-4"
					>
						<motion.img
							src="https://placehold.co/40x40/d1d5db/4b5563?text=P"
							alt="Profile"
							className="h-10 w-10 rounded-full object-cover shadow-lg cursor-pointer transition-transform duration-200 hover:scale-110"
							onClick={() => onPageChange('profile')}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
						/>
						<motion.button
							onClick={disconnect}
							className="px-6 py-2 bg-red-500 text-white font-medium rounded-full shadow-lg hover:bg-red-600 transition-colors"
						>
							Disconnect
						</motion.button>
					</motion.div>
				) : (
					<motion.button
						key="connect-btn"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						onClick={connect}
						className="px-6 py-2 bg-gray-900 text-white font-medium rounded-full shadow-lg hover:bg-gray-700 transition-colors"
					>
						Connect Wallet
					</motion.button>
				)}
			</AnimatePresence>
		</div>
	</motion.header>
);

const SectionCard: React.FC<SectionCardProps> = ({ title, children, className }) => (
	<motion.div 
		variants={cardVariants}
		className={`bg-white/50 backdrop-blur-lg shadow-lg rounded-3xl p-8 ${className ? className : ''}`}
	>
		<h2 className="text-2xl font-semibold text-gray-800 mb-6">{title}</h2>
		{children}
	</motion.div>
);

const InputField: React.FC<InputFieldProps> = ({ label, type = 'text', value, onChange, placeholder }) => (
	<div className="mb-4">
		<label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
		<input
			type={type}
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			className="w-full px-4 py-2 rounded-xl bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
		/>
	</div>
);

const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, className }) => (
	<motion.button
		onClick={onClick}
		disabled={disabled}
		whileHover={{ scale: 1.05 }}
		whileTap={{ scale: 0.95 }}
		className={`w-full px-4 py-3 rounded-full font-bold text-white shadow-lg transition-all transform ${
			disabled
				? 'bg-gray-400 cursor-not-allowed'
				: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 active:scale-95'
		} ${className}`}
	>
		{children}
	</motion.button>
);

const ScholarshipApplicationForm = ({ scholarship, onFormSubmit, onBackClick }) => {
	const [name, setName] = useState('');
	const [parentName, setParentName] = useState('');
	const [aadhaar, setAadhaar] = useState('');
	const [address, setAddress] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [pincode, setPincode] = useState('');
	const [academicInfo, setAcademicInfo] = useState('');
	const [extraInfo, setExtraInfo] = useState('');
	const [ipfsCid, setIpfsCid] = useState('');

	const handleSubmit = () => {
		const formData = {
			name,
			parentName,
			aadhaar,
			address,
			city,
			state,
			pincode,
			academicInfo,
			extraInfo,
			ipfsCid,
			scholarshipType: scholarship.id,
		};
		onFormSubmit(formData);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 50 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<SectionCard title={`Application for ${scholarship.title} Scholarship`}>
				<p className="mb-6 text-sm text-gray-500">
					Please fill out the form below to apply.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<InputField
						label="Full Name"
						placeholder="e.g., Jane Doe"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<InputField
						label="Father's/Mother's Name"
						placeholder="e.g., John Doe"
						value={parentName}
						onChange={(e) => setParentName(e.target.value)}
					/>
					<InputField
						label="Aadhaar Number"
						placeholder="e.g., XXXX XXXX XXXX"
						value={aadhaar}
						onChange={(e) => setAadhaar(e.target.value)}
					/>
					<InputField
						label="Address"
						placeholder="e.g., House No., Street Name"
						value={address}
						onChange={(e) => setAddress(e.target.value)}
					/>
					<InputField
						label="City"
						placeholder="e.g., Mumbai"
						value={city}
						onChange={(e) => setCity(e.target.value)}
					/>
					<InputField
						label="State"
						placeholder="e.g., Maharashtra"
						value={state}
						onChange={(e) => setState(e.target.value)}
					/>
					<InputField
						label="Pincode"
						placeholder="e.g., 400001"
						type="number"
						value={pincode}
						onChange={(e) => setPincode(e.target.value)}
					/>
					{scholarship.id === 'merit' && (
						<InputField
							label="Academic Details (GPA/Marks)"
							placeholder="e.g., GPA: 3.8/4.0 or Marks: 95%"
							value={academicInfo}
							onChange={(e) => setAcademicInfo(e.target.value)}
						/>
					)}
					{scholarship.id === 'sports' && (
						<InputField
							label="Sports Achievements"
							placeholder="e.g., National level swimming champion"
							value={extraInfo}
							onChange={(e) => setExtraInfo(e.target.value)}
						/>
					)}
					{scholarship.id === 'artistic' && (
						<InputField
							label="Portfolio Link or Details"
							placeholder="e.g., Link to your portfolio"
							value={extraInfo}
							onChange={(e) => setExtraInfo(e.target.value)}
						/>
					)}
					<InputField
						label="IPFS CID (Supporting Documents)"
						placeholder="e.g., Qm..."
						value={ipfsCid}
						onChange={(e) => setIpfsCid(e.target.value)}
					/>
				</div>
				<div className="mt-8 flex justify-end space-x-4">
					<Button onClick={onBackClick} className="w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700">
						Cancel
					</Button>
					<Button onClick={handleSubmit} className="w-auto px-6 py-2">
						Submit Application
					</Button>
				</div>
			</SectionCard>
		</motion.div>
	);
};

const StudentSection: React.FC<StudentSectionProps> = ({ aptos, account, db, userId, appId }) => {
	const [localAppId, setLocalAppId] = useState<string>('');
	const [applicantInfo, setApplicantInfo] = useState<Applicant | null>(null);
	const [statusMessage, setStatusMessage] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	
	const handleGetInfo = async () => {
		setLoading(true);
		setApplicantInfo(null);
		setStatusMessage('');
		try {
			const applicantRef = doc(db, `artifacts/${appId}/public/data/applicants`, localAppId);
			const docSnap = await getDoc(applicantRef);

			if (docSnap.exists()) {
				const info = docSnap.data() as Applicant;
				setApplicantInfo(info);
			} else {
				setStatusMessage('No applicant found for this ID.');
			}
		} catch (error) {
			console.error('View function call failed:', error);
			setStatusMessage('Error fetching applicant info.');
		} finally {
			setLoading(false);
		}
	};

	const handleClaim = async () => {
		setLoading(true);
		setStatusMessage('');
		try {
			const applicantRef = doc(db, `artifacts/${appId}/public/data/applicants`, localAppId);
			const docSnap = await getDoc(applicantRef);
			const existingInfo = docSnap.data() as Applicant;

			if (existingInfo && existingInfo.verified && existingInfo.allocated > 0 && !existingInfo.claimed) {
				await updateDoc(applicantRef, {
					claimed: true,
				});

				const vaultRef = doc(db, `artifacts/${appId}/public/data/vault`, 'funds');
				const vaultSnap = await getDoc(vaultRef);
				let currentVault = 0;
				if (vaultSnap.exists()) {
					currentVault = vaultSnap.data().amount || 0;
				}
				
				await setDoc(vaultRef, { amount: currentVault - existingInfo.allocated });

				setApplicantInfo({ ...existingInfo, claimed: true });
				setStatusMessage('Scholarship claimed successfully!');
			} else {
				setStatusMessage('Unable to claim. Check if you are verified and have an allocation.');
			}
		} catch (error) {
			console.error('Claim transaction failed:', error);
			setStatusMessage('Error claiming scholarship. Please check if you are verified and have an allocation.');
		} finally {
			setLoading(false);
		}
	};
	
	useEffect(() => {
		if(localAppId) {
			const q = doc(db, `artifacts/${appId}/public/data/applicants`, localAppId);
			const unsubscribe = onSnapshot(q, (docSnap) => {
				if(docSnap.exists()){
					setApplicantInfo(docSnap.data() as Applicant);
				}
			});
			return () => unsubscribe();
		}
	}, [localAppId, db, appId]);

	return (
		<motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-8">
			<SectionCard title="Application Status">
				<p className="mb-4 text-sm text-gray-500">
					Your User ID: {userId}
				</p>
				<InputField
					label="Application ID"
					placeholder="e.g., 1234"
					value={localAppId}
					onChange={(e) => setLocalAppId(e.target.value)}
				/>
				<Button onClick={handleGetInfo} disabled={!localAppId || loading} className="mb-4">
					{loading ? 'Fetching...' : 'Get Info'}
				</Button>

				<AnimatePresence>
				{applicantInfo && (
					<motion.div 
						key="info"
						variants={messageVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="space-y-2 mt-4 text-sm font-mono text-gray-700 bg-gray-100 p-4 rounded-xl"
					>
						<p><strong>Student:</strong> {applicantInfo.student.substring(0, 10)}...</p>
						<p><strong>Verified:</strong> <span className={applicantInfo.verified ? 'text-green-600' : 'text-red-600'}>{applicantInfo.verified ? 'Yes' : 'No'}</span></p>
						<p><strong>Allocated:</strong> {applicantInfo.allocated} APT</p>
						<p><strong>Claimed:</strong> <span className={applicantInfo.claimed ? 'text-green-600' : 'text-red-600'}>{applicantInfo.claimed ? 'Yes' : 'No'}</span></p>
					</motion.div>
				)}
				</AnimatePresence>

				<div className="mt-6">
					<Button
						onClick={handleClaim}
						disabled={!applicantInfo || !applicantInfo.verified || applicantInfo.allocated === 0 || applicantInfo.claimed || loading}
						className="bg-green-500 hover:bg-green-600"
					>
						{loading ? 'Claiming...' : 'Claim Scholarship'}
					</Button>
				</div>
        
				<AnimatePresence>
				{statusMessage && (
					<motion.div 
						key="status"
						variants={messageVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						className="mt-4 text-center text-sm font-medium text-blue-600"
					>
						{statusMessage}
					</motion.div>
				)}
				</AnimatePresence>
			</SectionCard>
		</motion.div>
	);
};

const OwnerSection: React.FC<OwnerSectionProps> = ({ aptos, account, db, userId, appId }) => {
	const [appIdInput, setAppIdInput] = useState<string>('');
	const [amount, setAmount] = useState<string>('');
	const [vaultFunds, setVaultFunds] = useState<number>(0);
	const [statusMessage, setStatusMessage] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(false);
	const [applicants, setApplicants] = useState<Applicant[]>([]);

	useEffect(() => {
	const vaultRef = doc(db, `artifacts/${appId}/public/data/vault`, 'funds');
		const unsubscribeVault = onSnapshot(vaultRef, (docSnap) => {
			if (docSnap.exists()) {
				setVaultFunds(docSnap.data().amount || 0);
			} else {
				setVaultFunds(0);
			}
		});

	const applicantsCollection = collection(db, `artifacts/${appId}/public/data/applicants`);
		const unsubscribeApplicants = onSnapshot(applicantsCollection, (querySnapshot) => {
			const fetchedApplicants: Applicant[] = [];
			querySnapshot.forEach((docSnap: any) => {
				fetchedApplicants.push(docSnap.data() as Applicant);
			});
			setApplicants(fetchedApplicants);
		});

		return () => {
			unsubscribeVault();
			unsubscribeApplicants();
		};
	}, [db, appId]);

	const handleVerify = async () => {
		setLoading(true);
		setStatusMessage('');
		try {
			const applicantRef = doc(db, `artifacts/${appId}/public/data/applicants`, appIdInput);
			await updateDoc(applicantRef, { verified: true });
			setStatusMessage('Applicant verified successfully!');
		} catch (error) {
			console.error('Verification failed:', error);
			setStatusMessage('Error verifying applicant. Please check the Application ID.');
		} finally {
			setLoading(false);
		}
	};

	const handleFund = async () => {
		setLoading(true);
		setStatusMessage('');
		try {
			const applicantRef = doc(db, `artifacts/${appId}/public/data/applicants`, appIdInput);
			const docSnap = await getDoc(applicantRef);
			const existingInfo = docSnap.data() as Applicant;
			
			const newAllocated = (existingInfo.allocated || 0) + parseInt(amount);
			await updateDoc(applicantRef, { allocated: newAllocated });

			const vaultRef = doc(db, `artifacts/${appId}/public/data/vault`, 'funds');
			const vaultSnap = await getDoc(vaultRef);
			const currentVault = vaultSnap.exists() ? vaultSnap.data().amount || 0 : 0;
			
			await setDoc(vaultRef, { amount: currentVault + parseInt(amount) });
			
			setStatusMessage(`Successfully funded applicant ${appIdInput} with ${amount} APT.`);
		} catch (error) {
			console.error('Funding failed:', error);
			setStatusMessage('Error funding applicant. Please check the Application ID and amount.');
		} finally {
			setLoading(false);
		}
	};

	const handleWithdraw = async () => {
		setLoading(true);
		setStatusMessage('');
		try {
			const vaultRef = doc(db, `artifacts/${appId}/public/data/vault`, 'funds');
			const vaultSnap = await getDoc(vaultRef);
			const currentVault = vaultSnap.exists() ? vaultSnap.data().amount || 0 : 0;
			
			const withdrawAmount = parseInt(amount);
			if (currentVault < withdrawAmount) {
				setStatusMessage('Insufficient funds in the vault to withdraw.');
				return;
			}
			
			await setDoc(vaultRef, { amount: currentVault - withdrawAmount });
			
			setStatusMessage(`Successfully withdrew ${amount} APT from the vault.`);
		} catch (error) {
			console.error('Withdrawal failed:', error);
			setStatusMessage('Error withdrawing funds. Please check the amount.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-8">
			<SectionCard title="Manage Applicants">
				<p className="mb-4 text-sm text-gray-500">
					Your User ID: {userId}
				</p>
				<InputField
					label="Application ID to Verify"
					placeholder="e.g., 1234"
					value={appIdInput}
					onChange={(e) => setAppIdInput(e.target.value)}
				/>
				<Button onClick={handleVerify} disabled={!appIdInput || loading}>
					{loading ? 'Verifying...' : 'Verify Applicant'}
				</Button>

				<div className="mt-8">
					<h3 className="text-lg font-medium mb-2">Fund Applicant</h3>
					<InputField
						label="Application ID"
						placeholder="e.g., 1234"
						value={appIdInput}
						onChange={(e) => setAppIdInput(e.target.value)}
					/>
					<InputField
						label="Amount (APT)"
						type="number"
						placeholder="e.g., 100"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
					<Button onClick={handleFund} disabled={!appIdInput || !amount || loading} className="bg-green-500 hover:bg-green-600">
						{loading ? 'Funding...' : 'Fund Applicant'}
					</Button>
				</div>
			</SectionCard>

			<SectionCard title="Vault Management">
				<p className="text-xl font-bold mb-4">
					Current Vault Funds: <span className="text-blue-600">{vaultFunds}</span> APT
				</p>
				<div className="mt-4">
					<h3 className="text-lg font-medium mb-2">Withdraw Funds</h3>
					<InputField
						label="Amount to Withdraw (APT)"
						type="number"
						placeholder="e.g., 50"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
					<Button onClick={handleWithdraw} disabled={!amount || loading} className="bg-red-500 hover:bg-red-600">
						{loading ? 'Withdrawing...' : 'Withdraw Funds'}
					</Button>
				</div>
			</SectionCard>

			<AnimatePresence>
			{statusMessage && (
				<motion.div
					key="status"
					variants={messageVariants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className="md:col-span-2 mt-4 text-center text-sm font-medium p-4 rounded-xl bg-blue-100 text-blue-800"
				>
					{statusMessage}
				</motion.div>
			)}
			</AnimatePresence>
		</motion.div>
	);
};

const scholarshipsData = [
	{
		id: "merit",
		title: "Merit-Based",
		description: "For academic excellence with a focus on marks and GPA.",
		icon: "🏅",
		details: {
			criteria: [
				"Minimum GPA of 3.5 or equivalent",
				"Maintain a full-time student status",
				"Submit an academic transcript"
			],
			terms: [
				"Scholarship must be used for tuition and academic fees only.",
				"Recipient must provide a progress report each semester."
			]
		}
	},
	{
		id: "sports",
		title: "Sports-Based",
		description: "Awarded to talented athletes excelling in sports.",
		icon: "🏆",
		details: {
			criteria: [
				"Demonstrated excellence in a collegiate sport.",
				"Letter of recommendation from a coach.",
				"Must be an active member of the university's sports team."
			],
			terms: [
				"Scholarship is contingent on continued participation in the sport.",
				"Subject to review based on athletic performance and conduct."
			]
		}
	},
	{
		id: "need",
		title: "Need-Based",
		description: "Financial aid for students demonstrating need.",
		icon: "🤝",
		details: {
			criteria: [
				"Proof of financial need through official documents.",
				"Family income must fall below a certain threshold.",
				"Complete and submit a FAFSA or equivalent form."
			],
			terms: [
				"Funds are allocated based on a detailed financial review.",
				"Re-evaluation of financial status may occur annually."
			]
		}
	},
	{
		id: "artistic",
		title: "Artistic",
		description: "For students with outstanding talent in the arts.",
		icon: "🎨",
		details: {
			criteria: [
				"Submission of a portfolio showcasing artistic work.",
				"Letter of recommendation from an art instructor.",
				"Must be pursuing a degree in a creative field."
			],
			terms: [
				"Recipient is expected to participate in university art exhibitions.",
				"Funds can be used for art supplies, studio fees, and tuition."
			]
		}
	},
	{
		id: "stem",
		title: "STEM",
		description: "Encouraging careers in Science, Tech, Engineering, and Math.",
		icon: "🔬",
		details: {
			criteria: [
				"Major in a STEM field (Science, Technology, Engineering, or Math).",
				"Strong academic record in science and math courses.",
				"A personal essay on why you chose a STEM career."
			],
			terms: [
				"Recipients are encouraged to participate in relevant research projects.",
				"Must maintain a GPA above 3.0 in major coursework."
			]
		}
	},
	{
		id: "community",
		title: "Community Service",
		description: "Recognizing dedication to volunteering and community work.",
		icon: "🌍",
		details: {
			criteria: [
				"Documented proof of at least 100 hours of community service.",
				"Letter of recommendation from a non-profit organization.",
				"An essay detailing your impact on the community."
			],
			terms: [
				"Continued engagement in community service is expected.",
				"Scholarship funds are intended to support educational expenses."
			]
		}
	}
];

const ScholarshipCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onApplyClick: () => void; }> = ({ title, description, icon, onApplyClick }) => (
	<motion.div 
		variants={cardVariants}
		className="bg-white/50 backdrop-blur-lg rounded-3xl p-6 text-center flex flex-col items-center justify-center shadow-lg hover:shadow-2xl transition-shadow duration-300"
	>
		<div className="text-4xl text-blue-600 mb-4">{icon}</div>
		<h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
		<p className="text-sm text-gray-600 mb-4">{description}</p>
		<Button onClick={onApplyClick} className="w-auto px-6 py-2">
			Apply
		</Button>
	</motion.div>
);

const ScholarshipTypesSection = ({ onSelectScholarship }) => {
	
	return (
		<section className="mb-16">
			<h2 className="text-3xl font-bold text-center text-white mb-8">Explore Scholarship Opportunities</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
				{scholarshipsData.map((s, index) => (
					<ScholarshipCard 
						key={index} 
						title={s.title} 
						description={s.description} 
						icon={s.icon} 
						onApplyClick={() => onSelectScholarship(s)}
					/>
				))}
			</div>
		</section>
	);
};

const ScholarshipDetailsSection = ({ scholarship, onBackClick, onApplyClick }) => {
	if (!scholarship) return null;
	
	return (
		<motion.div
			initial={{ opacity: 0, y: 50 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<SectionCard title={scholarship.title}>
				<p className="text-gray-700 mb-6">{scholarship.description}</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="bg-gray-100 p-6 rounded-xl">
						<h3 className="text-xl font-semibold text-gray-800 mb-4">Eligibility Criteria</h3>
						<ul className="list-disc list-inside space-y-2 text-gray-700">
							{scholarship.details.criteria.map((item, index) => (
								<li key={index}>{item}</li>
							))}
						</ul>
					</div>
					<div className="bg-gray-100 p-6 rounded-xl">
						<h3 className="text-xl font-semibold text-gray-800 mb-4">Terms & Conditions</h3>
						<ul className="list-disc list-inside space-y-2 text-gray-700">
							{scholarship.details.terms.map((item, index) => (
								<li key={index}>{item}</li>
							))}
						</ul>
					</div>
				</div>
				<div className="mt-8 flex justify-end space-x-4">
					<Button onClick={onBackClick} className="w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700">
						Back
					</Button>
					<Button onClick={onApplyClick} className="w-auto px-6 py-2">
						Apply Now
					</Button>
				</div>
			</SectionCard>
		</motion.div>
	);
};

const AboutSection = () => (
	<SectionCard title="About DSDPT">
		<p className="text-gray-700">DSDPT stands for Decentralized Scholarship Distribution and Payment Tracker. It's a dApp built to streamline the process of applying for and distributing scholarships in a transparent and secure manner. Our goal is to connect students with funding opportunities and provide distributors with a reliable tool to manage their grants.</p>
	</SectionCard>
);

const ContactSection = () => (
	<SectionCard title="Contact Us">
		<p className="text-gray-700">For support, partnership inquiries, or feedback, please reach out to us. We'd love to hear from you!</p>
		<ul className="mt-4 space-y-2 text-gray-700">
			<li><strong>Email:</strong> support@dsdpt.com</li>
			<li><strong>Twitter:</strong> @DSDPT_dApp</li>
			<li><strong>Discord:</strong> DSDPT-Community</li>
		</ul>
	</SectionCard>
);

const ProfileSection: React.FC<ProfileSectionProps> = ({ account, userId }) => (
	<SectionCard title="My Profile">
		<p className="text-gray-700">This section shows your connected wallet and user information.</p>
		<div className="mt-6 space-y-4">
			<div className="bg-gray-100 p-4 rounded-xl">
				<h3 className="text-lg font-semibold text-gray-800">Connected Wallet</h3>
				<p className="font-mono text-sm text-gray-600 break-all">{account?.address || 'N/A'}</p>
			</div>
			<div className="bg-gray-100 p-4 rounded-xl">
				<h3 className="text-lg font-semibold text-gray-800">User ID</h3>
				<p className="font-mono text-sm text-gray-600 break-all">{userId}</p>
			</div>
			<div className="bg-gray-100 p-4 rounded-xl">
				<h3 className="text-lg font-semibold text-gray-800">Application Status</h3>
				<p className="text-sm text-gray-600">This section could be extended to show a list of your applications and their statuses.</p>
			</div>
		</div>
	</SectionCard>
);

const PETRA_LOGO = "data:image/png;base64,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";
const GOOGLE_LOGO = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHp2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgY2xhc3M9ImhfMjAgd18yMCI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMy41NCAxMi43NjEzQzIzLjU0IDExLjk0NTkgMjMuNDY2OCAxMS4xNjE4IDIzLjMzMDkgMTAuNDA5MUgxMi41VjE0Ljg1NzVIMTguNjg5MUMxOC40MjI1IDE2LjI5NSAxNy42MTIzIDE3LjUxMjkgMTYuMzk0MyAxOC4zMjg0VjIxLjIxMzhIMjAuMTEwOUMyMi4yODU1IDE5LjIxMTggMjMuNTQgMTYuMjYzNiAyMy41NCAxMi43NjEzWiIgZmlsbD0iIzQyODVGNCI+PC9wYXRoPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTIuNDk5NSAyMy45OTk4QzE1LjYwNDUgMjMuOTk5OCAxOC4yMDc3IDIyLjk3IDIwLjExMDQgMjEuMjEzN0wxNi4zOTM4IDE4LjMyODJDMTUuMzY0IDE5LjAxODIgMTQuMDQ2NyAxOS40MjU5IDEyLjQ5OTUgMTkuNDI1OUM5LjUwNDI1IDE5LjQyNTkgNi45NjkwMiAxNy40MDMgNi4wNjQ3IDE0LjY4NDhIMi4yMjI2NlYxNy42NjQ0QzQuMTE0OTMgMjEuNDIyOCA4LjAwNDAyIDIzLjk5OTggMTIuNDk5NSAyMy45OTk4Wk0iIGZpbGw9IiMzNEE4NTMiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSI2LjA2NTIzIDE0LjY4NTFDNS44MzUyMyAxMy45OTUxIDUuNzA0NTUgMTMuMjU4MSA1LjcwNDU1IDEyLjUwMDFDNS43MDQ1NSAxMS43NDIyIDUuODM1MjMgMTEuMDA1MSA2LjA2NTIzIDEwLjMxNTFWNy4zMzU1N0gyLjIyMzE4QzEuNDQ0MzIgOC44ODgwNyAxIDEwLjY0NDQgMSAxMi41MDAxQzEgMTQuMzU1OCAxLjQ0NDMyIDE2LjExMjIgMi4yMjMxOCAxNy42NjQ3TDYuMDY1MjMgMTQuNjg1MVoiIGZpbGw9IiNGQkJDMDUiPjwvcGF0aD48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyLjQ5OTUgNS41NzM4NkMxNC4xODc5IDUuNTczODYgMTUuNzAzOCA2LjE1NDA5IDE2Ljg5NTYgNy4yOTM2NEwyMC4xOTQgMy45OTUyM0MxOC4yMDI0IDIuMTM5NTUgMTUuNTk5MiAxIDEyLjQ5OTUgMUM4LjAwNDAyIDEgNC4xMTQ5MyAzLjU3NzA1IDIuMjIyNjYgNy4zMzU0NUw2LjA2NDcgMTAuMzE1QzYuOTY5MDIgNy41OTY4MiA5LjUwNDI1IDUuNTczODYgMTIuNDk5NSA1LjU3Mzg2WiIgZmlsbD0iI0VBNDMzNSI+PC9wYXRoPjwvc3ZnPg==";
const OTHER_LOGO = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxzdHlsZT4KICAgICAgICBwYXRoIHsKICAgICAgICAgICAgZmlsbDogYmxhY2s7CiAgICAgICAgfQoKICAgICAgICBAbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7CiAgICAgICAgICAgIHBhdGggewogICAgICAgICAgICAgICAgZmlsbDogd2hpdGU7CiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICA8L3N0eWxlPgogICAgPHBhdGgKICAgICAgICBkPSJNMjAuMzkzMiA4LjE4MjQyQzIwLjI1NzggOC4yOTA0MyAxNy44NjggOS42NzUzNyAxNy44NjggMTIuNzU0OUMxNy44NjggMTYuMzE2OCAyMC45MDkgMTcuNTc3IDIxIDE3LjYwODJDMjAuOTg2IDE3LjY4NSAyMC41MTY5IDE5LjMzMzkgMTkuMzk2NiAyMS4wMTQxQzE4LjM5NzcgMjIuNDkyNiAxNy4zNTQ1IDIzLjk2ODggMTUuNzY3NSAyMy45Njg4QzE0LjE4MDQgMjMuOTY4OCAxMy43NzIgMjMuMDIwNyAxMS45Mzk5IDIzLjAyMDdDMTAuMTU0NSAyMy4wMjA3IDkuNTE5NzIgMjQgOC4wNjgwNSAyNEM2LjYxNjM5IDI0IDUuNjAzNDkgMjIuNjMxOSA0LjQzODg5IDIwLjk1MTdDMy4wODk5MiAxOC45Nzg3IDIgMTUuOTEzNiAyIDEzLjAwNDVDMiA4LjMzODQzIDQuOTUwMDEgNS44NjM3OSA3Ljg1MzM0IDUuODYzNzlDOS4zOTYwMiA1Ljg2Mzc5IDEwLjY4MiA2LjkwNTQ5IDExLjY1MDUgNi45MDU0OUMxMi41NzI0IDYuOTA1NDkgMTQuMDEwMSA1LjgwMTM4IDE1Ljc2NTEgNS44MDEzOEMxNi40MzAzIDUuODAxMzggMTguODIwMiA1Ljg2Mzc5IDIwLjM5MzIgOC4xODI0MlpNMTQuOTMxOSAzLjgyNTk4QzE1LjY1NzggMi45NDAyOSAxNi4xNzEyIDEuNzExMzcgMTYuMTcxMiAwLjQ4MjQ0OEgxNi4xNzEyQzE2LjE3MTIgMC4zMTIwMzEgMTYuMTU3MiAwLjEzOTIxNCAxNi4xMjY5IDBDMTQuOTQ2IDAuMDQ1NjA0NiAxMy41NDEwIDAuODA4ODgxIDEyLjY5MzggMS44MTkzOEMxMi4wMjg2IDIuNTk3MDYgMTEuNDA3OCAzLjgyNTk4IDExLjQwNzggNS4wNzE3MUMxMS40MDc4IDUuMjU4OTMgMTEuNDM4MiA1LjQ0NjE0IDExLjQ1MjIgNS41MDYxNUMxMS41MjY4IDUuNTIwNTUgMTEuNjQ4MiA1LjUzNzM1IDExLjc2OTYgNS41MzczNUMxMi44MjkxIDUuNTM3MzUgMTQuMTYxOCA0LjgwNzY4IDE0LjkzMTkgMy44MjU5OFoiIC8+Cjwvc3ZnPg==";

const WALLET_OPTIONS = [
	{
		name: "Petra",
		id: "Petra",
		logo: PETRA_LOGO,
		label: "Petra"
	},
	{
		name: "Google",
		id: "Google",
		logo: GOOGLE_LOGO,
		label: "Continue with Google"
	},
	{
		name: "Other",
		id: "Other",
		logo: OTHER_LOGO,
		label: "Continue with Other"
	}
];

const WalletConnectModal = ({ isVisible, onClose, connectToWallet }: { isVisible: boolean; onClose: () => void; connectToWallet: (walletName: string) => void; }) => {
	if (!isVisible) return null;

	const { wallets } = useWallet();

	const getWalletId = (name: string) => {
		if (name.toLowerCase().includes("petra")) return "Petra";
		if (name.toLowerCase().includes("google")) return "Google";
		return "Other";
	};

	const availableOptions = WALLET_OPTIONS.filter(opt => wallets.some((w: { name: string }) => getWalletId(w.name) === opt.id));

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<motion.div
				initial={{ y: -50, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 50, opacity: 0 }}
				className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-sm"
				onClick={e => e.stopPropagation()}
			>
				<div className="flex justify-between items-center mb-6">
					<h3 className="text-xl font-bold text-gray-800">Connect Wallet</h3>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div className="space-y-4">
					{availableOptions.map((opt) => (
						<motion.button
							key={opt.id}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={() => {
								connectToWallet(opt.id);
								onClose();
							}}
							className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
						>
							<span className="h-8 w-8 flex items-center justify-center">
								<img src={opt.logo} alt={opt.label} style={{width:'32px',height:'32px'}} />
							</span>
							<span className="font-medium text-gray-700">{opt.label}</span>
						</motion.button>
					))}
				</div>
			</motion.div>
			</motion.div>
		);
	}

const DSDPTDappUI = (): JSX.Element => {
	const [isOwner, setIsOwner] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [db, setDb] = useState<any>(null);
	const [auth, setAuth] = useState<any>(null);
	const [userId, setUserId] = useState<string>('');
	const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState('home');
	const [selectedScholarship, setSelectedScholarship] = useState<any>(null);
	const [applicationSubmitted, setApplicationSubmitted] = useState(false);

	const { connected, account, connect, disconnect, signAndSubmitTransaction } = useWallet();

	const _app_id = typeof window !== 'undefined' && typeof window.app_id !== 'undefined' ? window._app_id : 'default-app-id';
	const _initial_auth_token = typeof window !== 'undefined' && typeof window.initial_auth_token !== 'undefined' ? window._initial_auth_token : undefined;

	// User-provided Firebase configuration
	const firebaseConfig = {
		apiKey: "AIzaSyCaq3RM1m7wd4CffnXFPVkFrD_fEA4ahuY",
		authDomain: "dsdpt-d2e87.firebaseapp.com",
		projectId: "dsdpt-d2e87",
		storageBucket: "dsdpt-d2e87.firebasestorage.app",
		messagingSenderId: "337228424855",
		appId: "1:337228424855:web:6be05218dac6ddf119abd2",
		measurementId: "G-3LZKK9DJ14"
	};
	
	useEffect(() => {
		let firebaseApp;
		if (!getApps().length) {
			firebaseApp = initializeApp(firebaseConfig);
		} else {
			firebaseApp = getApp();
		}
		const firestoreDb = getFirestore(firebaseApp);
		const firebaseAuth = getAuth(firebaseApp);
		setDb(firestoreDb);
		setAuth(firebaseAuth);

		onAuthStateChanged(firebaseAuth, async (user) => {
			if (user) {
				setUserId(user.uid);
			} else {
				if (_initial_auth_token) {
					try {
						await signInWithCustomToken(firebaseAuth, _initial_auth_token);
					} catch (error) {
						await signInAnonymously(firebaseAuth);
					}
				} else {
					await signInAnonymously(firebaseAuth);
				}
			}
			setIsAuthReady(true);
		});
	}, [_initial_auth_token]);
	
	useEffect(() => {
		if (account) {
			const isOwnerMock = account.address === '0x1A2B3C4D5E6F7A8B'; // Mock owner address
			setIsOwner(isOwnerMock);
		} else {
			setIsOwner(false);
		}
		setLoading(false);
	}, [account]);

	// Use wallet adapter's connect directly
	const connectToWallet = (walletName: string) => {
		connect(walletName);
	}

	const handlePageChange = (page: string, data: any = null) => {
		setCurrentPage(page);
		setSelectedScholarship(data);
	};
	
	const handleApplicationSubmit = async (formData: any) => {
		try {
			const applicantsCollection = collection(db, `artifacts/${_app_id}/public/data/applicants`);
			const newApplicant = {
				...formData,
				student: account?.address || userId,
				verified: false,
				allocated: 0,
				claimed: false,
			};
            
			const docRef = await addDoc(applicantsCollection, newApplicant);
			console.log(`Application submitted with ID: ${docRef.id}`);
			setApplicationSubmitted(true);
			handlePageChange('dashboard');
		} catch (error) {
			console.error('Application submission failed:', error);
		}
	};

	const renderPage = () => {
		if (!connected) {
			return (
				<>
					{/* Hero Section */}
					<section className="text-center mb-16">
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="text-4xl md:text-6xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200"
						>
							Streamline Your Scholarship Workflow
						</motion.h1>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="mt-4 text-xl text-white max-w-2xl mx-auto"
						>
							The ultimate DApp platform for students and distributors to collaborate, and deliver—faster and smarter.
						</motion.p>
						<motion.button
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.6 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsModalOpen(true)}
							className="mt-8 px-8 py-3 bg-white text-gray-800 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-all"
						>
							Get Started
						</motion.button>
					</section>

					{/* 3D Globe Section */}
					<section className="bg-white/50 rounded-3xl p-10 md:p-16 shadow-lg text-center mb-16">
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
							className="flex flex-col items-center justify-center"
						>
							<h2 className="text-3xl font-bold text-gray-800 mb-4">
								GROW BEYOND BORDERS
							</h2>
							<p className="text-gray-600 max-w-xl mb-8">
								Decentralized scholarship distribution powered by Aptos. Transparent, secure, and accessible to students everywhere.
							</p>
							<div className="flex justify-center">
								<Globe />
							</div>
						</motion.div>
					</section>
					<motion.div variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<SectionCard title="Connect to Continue">
							<p className="text-gray-700">Please connect your wallet to access the scholarship application and management features.</p>
						</SectionCard>
					</motion.div>
				</>
			);
		}

		switch (currentPage) {
			case 'dashboard':
				return (
					<motion.div key="dapp-content" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<AnimatePresence mode="wait">
							{isOwner ? (
								<motion.div key="owner-section" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5 }}>
									<OwnerSection aptos={{ signAndSubmitTransaction }} account={account} db={db} userId={userId} appId={_app_id} />
								</motion.div>
							) : (
								<motion.div key="student-section" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.5 }}>
									{applicationSubmitted ? (
										<StudentSection aptos={{ signAndSubmitTransaction }} account={account} db={db} userId={userId} appId={_app_id} />
									) : (
										<>
											<p className="text-center text-lg text-white mb-8">
												Choose a scholarship to apply or check your application status.
											</p>
											<ScholarshipTypesSection onSelectScholarship={(scholarship: any) => handlePageChange('scholarshipDetails', scholarship)} />
										</>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				);
			case 'about':
				return (
					<motion.div key="about-page" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<AboutSection />
					</motion.div>
				);
			case 'contact':
				return (
					<motion.div key="contact-page" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<ContactSection />
					</motion.div>
				);
			case 'profile':
				const walletAddress = account?.address?.toString() || 'N/A';
				return (
					<motion.div key="profile-page" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<ProfileSection account={{ address: walletAddress }} userId={userId} />
					</motion.div>
				);
			case 'scholarshipDetails':
				return (
					<motion.div key="scholarship-details-page" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<ScholarshipDetailsSection 
							scholarship={selectedScholarship} 
							onBackClick={() => handlePageChange('home')} 
							onApplyClick={() => handlePageChange('applyForm', selectedScholarship)} 
						/>
					</motion.div>
				);
			case 'applyForm':
				return (
					<motion.div key="apply-form-page" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
						<ScholarshipApplicationForm
							scholarship={selectedScholarship}
							onFormSubmit={handleApplicationSubmit}
							onBackClick={() => handlePageChange('home')}
						/>
					</motion.div>
				);
			default:
				return (
					<>
						{/* Hero Section */}
						<section className="text-center mb-16">
							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="text-4xl md:text-6xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200"
							>
								Streamline Your Scholarship Workflow
							</motion.h1>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="mt-4 text-xl text-white max-w-2xl mx-auto"
							>
								The ultimate DApp platform for students and distributors to collaborate, and deliver—faster and smarter.
							</motion.p>
							<motion.button
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.6 }}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setIsModalOpen(true)}
								className="mt-8 px-8 py-3 bg-white text-gray-800 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-all"
							>
								Get Started
							</motion.button>
						</section>

						{/* 3D Globe Section */}
						<section className="bg-white/50 rounded-3xl p-10 md:p-16 shadow-lg text-center mb-16">
							<motion.div
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
								className="flex flex-col items-center justify-center"
							>
								<h2 className="text-3xl font-bold text-gray-800 mb-4">
									GROW BEYOND BORDERS
								</h2>
								<p className="text-gray-600 max-w-xl mb-8">
									Decentralized scholarship distribution powered by Aptos. Transparent, secure, and accessible to students everywhere.
								</p>
								<div className="flex justify-center">
									<Globe />
								</div>
							</motion.div>
						</section>
						<ScholarshipTypesSection onSelectScholarship={(scholarship) => handlePageChange('scholarshipDetails', scholarship)} />
					</>
				);
		}
	};
	
	if (!isAuthReady || loading) {
		return (
			<div className="flex items-center justify-center min-h-screen font-sans bg-gradient-to-r from-purple-700 to-pink-500">
				<div className="text-center p-8 bg-white rounded-2xl shadow-lg">
					<p className="text-xl font-semibold text-gray-800">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen font-sans flex flex-col items-center text-gray-800" style={{background: 'linear-gradient(to right, #eaafc8, #654ea3)'}}>
			<style>{`
				body {
					font-family: 'Inter', sans-serif;
				}
			`}</style>
			
			<Header connected={connected} connect={() => setIsModalOpen(true)} disconnect={disconnect} onPageChange={handlePageChange} currentPage={currentPage} />
      
			<main className="w-full container mx-auto pt-24 p-8">
				<AnimatePresence mode="wait">
					{renderPage()}
				</AnimatePresence>
			</main>
      
			<AnimatePresence>
						{isModalOpen && (
							<WalletConnectModal 
								isVisible={isModalOpen} 
								onClose={() => setIsModalOpen(false)} 
								connectToWallet={connectToWallet}
							/>
						)}
			</AnimatePresence>
		</div>
	);
};

export { DSDPTDappUI as Dsdpt };