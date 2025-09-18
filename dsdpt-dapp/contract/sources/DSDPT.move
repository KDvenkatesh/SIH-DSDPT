address DSDPT {
module ScholarshipDistributor {

    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin;
    use aptos_framework::table;
    use aptos_std::option;

    /// Applicant details
    struct Applicant has copy, drop, store {
        student: address,
        ipfs_cid: vector<u8>,
        verified: bool,
        allocated: u64,
        claimed: bool
    }

    /// Registry resource stored under contract owner
    struct Registry has key {
        owner: address,
        next_id: u64,
        applicants: table::Table<u64, Applicant>,
        vault: coin::Coin<aptos_coin::AptosCoin>
    }

    /// Initialize registry (call once by owner after publish)
    public entry fun init(owner: &signer) {
        let registry = Registry {
            owner: signer::address_of(owner),
            next_id: 1,
            applicants: table::new<u64, Applicant>(),
            vault: coin::zero<aptos_coin::AptosCoin>()
        };
        move_to(owner, registry);
    }

    /// Students apply for scholarship
    public entry fun apply(student: &signer, ipfs_cid: vector<u8>) acquires Registry {
        let reg = borrow_global_mut<Registry>(@DSDPT);
        let app_id = reg.next_id;
        reg.next_id = app_id + 1;

        let applicant = Applicant {
            student: signer::address_of(student),
            ipfs_cid,
            verified: false,
            allocated: 0,
            claimed: false
        };

        table::add(&mut reg.applicants, app_id, applicant);
    }

    /// Owner verifies an applicant (mock/manual verification for demo)
    public entry fun verify(owner: &signer, app_id: u64) acquires Registry {
        let reg = borrow_global_mut<Registry>(@DSDPT);
        assert!(signer::address_of(owner) == reg.owner, 1);
        let applicant = table::borrow_mut(&mut reg.applicants, app_id);
        applicant.verified = true;
    }

        /// Owner allocates funds to an applicant by withdrawing from their own account
        public entry fun fund(owner: &signer, app_id: u64, amount: u64) acquires Registry {
        let reg = borrow_global_mut<Registry>(@DSDPT);
        assert!(signer::address_of(owner) == reg.owner, 2);
        assert!(table::contains(&reg.applicants, app_id), 3);

        // Withdraw from owner's AptosCoin account
        let coin_in = coin::withdraw<aptos_coin::AptosCoin>(owner, amount);

        // Merge into vault
        coin::merge(&mut reg.vault, coin_in);

        // Update applicant allocation
        let applicant = table::borrow_mut(&mut reg.applicants, app_id);
        applicant.allocated = applicant.allocated + amount;
    }


    /// Student claims their scholarship after verification
    public entry fun claim(student: &signer, app_id: u64) acquires Registry {
        let reg = borrow_global_mut<Registry>(@DSDPT);
        let applicant = table::borrow_mut(&mut reg.applicants, app_id);

        assert!(signer::address_of(student) == applicant.student, 4);
        assert!(applicant.verified, 5);
        assert!(!applicant.claimed, 6);
        assert!(applicant.allocated > 0, 7);

        let amount = applicant.allocated;
        applicant.claimed = true;
        applicant.allocated = 0;

        let coin_out = coin::extract(&mut reg.vault, amount);
        coin::deposit(signer::address_of(student), coin_out);
    }

    /// Owner withdraws surplus/unallocated funds from vault
    public entry fun owner_withdraw(owner: &signer, amount: u64) acquires Registry {
        let reg = borrow_global_mut<Registry>(@DSDPT);
        assert!(signer::address_of(owner) == reg.owner, 8);
        let coin_out = coin::extract(&mut reg.vault, amount);
        coin::deposit(signer::address_of(owner), coin_out);
    }

        /// Convenience view: check applicant info (returns Option)
    public fun get_applicant_info(app_id: u64): option::Option<Applicant> acquires Registry {
        if (!exists<Registry>(@DSDPT)) {
            return option::none<Applicant>();
        };
        let reg = borrow_global<Registry>(@DSDPT);
        if (!table::contains(&reg.applicants, app_id)) {
            return option::none<Applicant>();
        };
        let ap_ref = table::borrow(&reg.applicants, app_id);
        option::some<Applicant>(*ap_ref)
    }

}
}