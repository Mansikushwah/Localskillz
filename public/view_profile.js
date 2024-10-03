function viewProfile(anchorElement) {
    console.log("vimla");
    const userId = anchorElement.getAttribute('data_user_id');
    window.location.href = `/another_profile/${userId}`;
}