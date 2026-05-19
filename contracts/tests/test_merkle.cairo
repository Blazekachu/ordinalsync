use ordinalsync::merkle::{verify_merkle_proof, hash_pair};

#[test]
fn test_verify_simple_merkle_proof() {
    let tx_hash: u256 = 0x1111111111111111111111111111111111111111111111111111111111111111;
    let sibling: u256 = 0x2222222222222222222222222222222222222222222222222222222222222222;

    // Compute expected root using hash_pair
    let expected_root = hash_pair(tx_hash, sibling);

    let merkle_path = array![sibling];
    let merkle_direction = array![true]; // sibling is on the right

    let result = verify_merkle_proof(tx_hash, merkle_path, merkle_direction, expected_root);
    assert(result == true, 'merkle proof should verify');
}

#[test]
fn test_reject_invalid_merkle_proof() {
    let tx_hash: u256 = 0x1111111111111111111111111111111111111111111111111111111111111111;
    let sibling: u256 = 0x2222222222222222222222222222222222222222222222222222222222222222;
    let merkle_path = array![sibling];
    let merkle_direction = array![true];
    let wrong_root: u256 = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef;

    let result = verify_merkle_proof(tx_hash, merkle_path, merkle_direction, wrong_root);
    assert(result == false, 'invalid proof should fail');
}

#[test]
fn test_empty_proof_single_tx_block() {
    // For a single-TX block, tx_hash == merkle_root, no siblings
    let tx_hash: u256 = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
    let merkle_path: Array<u256> = array![];
    let merkle_direction: Array<bool> = array![];

    let result = verify_merkle_proof(tx_hash, merkle_path, merkle_direction, tx_hash);
    assert(result == true, 'single tx should equal root');
}
