pub fn verify_merkle_proof(
    tx_hash: u256,
    merkle_path: Array<u256>,
    merkle_direction: Array<bool>,
    expected_root: u256,
) -> bool {
    assert(merkle_path.len() == merkle_direction.len(), 'path/direction length mismatch');

    let mut current_hash = tx_hash;
    let mut i: u32 = 0;
    let path_len = merkle_path.len();

    while i < path_len {
        let sibling = *merkle_path.at(i);
        let is_right = *merkle_direction.at(i);

        current_hash = if is_right {
            hash_pair(current_hash, sibling)
        } else {
            hash_pair(sibling, current_hash)
        };

        i += 1;
    };

    current_hash == expected_root
}

pub fn hash_pair(left: u256, right: u256) -> u256 {
    // PoC: keccak256. Production: sha256d (double SHA-256, byte-reversed)
    let mut data: Array<u256> = array![];
    data.append(left);
    data.append(right);
    core::keccak::keccak_u256s_be_inputs(data.span())
}
