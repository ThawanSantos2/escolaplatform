// Verificar autenticação
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Páginas que não requerem autenticação
    const publicPages = ['login.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!user && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return null;
    }
    
    // Se estiver em página de login/registro e já autenticado, redireciona
    if (user && publicPages.includes(currentPage)) {
        window.location.href = 'index.html';
        return null;
    }
    
    return user;
}

// Menu Hambúrguer
function setupHamburgerMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    
    if (menuBtn && hamburgerMenu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerMenu.classList.add('active');
        });
    }
    
    if (closeMenuBtn && hamburgerMenu) {
        closeMenuBtn.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
        });
    }
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (hamburgerMenu && !hamburgerMenu.contains(e.target) && e.target !== menuBtn) {
            hamburgerMenu.classList.remove('active');
        }
    });
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    showLoading();
    try {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            showNotification('Logout realizado com sucesso!');
            setTimeout(() => window.location.href = 'login.html', 1000);
        }
    } finally {
        hideLoading();
    }
});

// Login
function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        
        if (!email || !password) {
            showNotification('Por favor, preencha todos os campos', false);
            return;
        }
        
        showLoading();
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                showNotification('Erro no login: ' + error.message, false);
            } else {
                showNotification('Login realizado com sucesso!');
                setTimeout(() => window.location.href = 'index.html', 1000);
            }
        } finally {
            hideLoading();
        }
    });
}

// Registro
function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = form.querySelector('#name').value;
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;
        
        if (!name || !email || !password) {
            showNotification('Por favor, preencha todos os campos', false);
            return;
        }
        
        if (password.length < 6) {
            showNotification('A senha deve ter pelo menos 6 caracteres', false);
            return;
        }
        
        showLoading();
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        bio: '',
                        profile_image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg'
                    }
                }
            });
            
            if (error) {
                showNotification('Erro no registro: ' + error.message, false);
            } else {
                showNotification('Registro realizado com sucesso! Por favor, faça login.');
                setTimeout(() => window.location.href = 'login.html', 1000);
            }
        } finally {
            hideLoading();
        }
    });
}

// Carregar posts na página inicial
async function loadPosts() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (!error) {
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'bg-white rounded-lg shadow-md overflow-hidden';
            postElement.innerHTML = `
                <div class="p-4">
                    <div class="flex items-center mb-3">
                        <img src="${post.user_profile_image || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg'}" 
                             class="w-10 h-10 rounded-full mr-3">
                        <span class="font-semibold">${post.user_name}</span>
                    </div>
                    ${post.media_url ? 
                        (post.media_url.includes('.mp4') ? 
                            `<video src="${post.media_url}" controls class="w-full post-image"></video>` : 
                            `<img src="${post.media_url}" class="w-full post-image">`) : ''}
                    <p class="mt-3">${post.description}</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        ${post.tags?.split(',').map(tag => 
                            `<span class="bg-gray-100 px-2 py-1 rounded-full text-sm">#${tag.trim()}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });
    }
}

// Novo post
document.getElementById('newPostBtn')?.addEventListener('click', () => {
    document.getElementById('postModal').classList.remove('hidden');
});

document.getElementById('closePostModalBtn')?.addEventListener('click', () => {
    document.getElementById('postModal').classList.add('hidden');
});

document.getElementById('postForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('postFile');
    const description = document.getElementById('postDescription').value;
    const tags = document.getElementById('postTags').value;
    
    const user = await checkAuth();
    if (!user) return;
    
    showLoading();
    try {
        let mediaUrl = '';
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;
            
            const { data, error } = await supabase.storage
                .from('posts')
                .upload(filePath, file);
            
            if (error) {
                showNotification('Erro ao fazer upload do arquivo: ' + error.message, false);
                return;
            }
            
            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(filePath);
            
            mediaUrl = publicUrl;
        }
        
        const { error } = await supabase
            .from('posts')
            .insert([{
                user_id: user.id,
                user_name: user.user_metadata.name,
                user_profile_image: user.user_metadata.profile_image,
                media_url: mediaUrl,
                description,
                tags,
                created_at: new Date()
            }]);
        
        if (error) {
            showNotification('Erro ao criar post: ' + error.message, false);
        } else {
            document.getElementById('postModal').classList.add('hidden');
            document.getElementById('postForm').reset();
            loadPosts();
            showNotification('Post criado com sucesso!');
        }
    } finally {
        hideLoading();
    }
});

// Perfil do usuário
async function loadProfile() {
    const user = await checkAuth();
    if (!user) return;
    
    document.getElementById('name').value = user.user_metadata.name || '';
    document.getElementById('bio').value = user.user_metadata.bio || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('profileImage').src = user.user_metadata.profile_image || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg';
    
    // Carregar posts do usuário
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    if (!error) {
        const postsContainer = document.getElementById('userPostsContainer');
        postsContainer.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'bg-white rounded-lg shadow-md overflow-hidden';
            postElement.innerHTML = `
                <div class="p-4">
                    ${post.media_url ? 
                        (post.media_url.includes('.mp4') ? 
                            `<video src="${post.media_url}" controls class="w-full post-image"></video>` : 
                            `<img src="${post.media_url}" class="w-full post-image">`) : ''}
                    <p class="mt-3">${post.description}</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                        ${post.tags?.split(',').map(tag => 
                            `<span class="bg-gray-100 px-2 py-1 rounded-full text-sm">#${tag.trim()}</span>`
                        ).join('')}
                    </div>
                    <button class="delete-post mt-3 text-red-500" data-id="${post.id}">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });
        
        // Adicionar eventos para deletar posts
        document.querySelectorAll('.delete-post').forEach(button => {
            button.addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja excluir este post?')) {
                    const { error } = await supabase
                        .from('posts')
                        .delete()
                        .eq('id', button.dataset.id);
                    
                    if (!error) {
                        button.closest('div').remove();
                    }
                }
            });
        });
    }
}

// Atualizar perfil
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await checkAuth();
    if (!user) return;
    
    const name = document.getElementById('name').value;
    const bio = document.getElementById('bio').value;
    const email = document.getElementById('email').value;
    
    showLoading();
    try {
        const { error } = await supabase.auth.updateUser({
            email,
            data: {
                name,
                bio
            }
        });
        
        if (error) {
            showNotification('Erro ao atualizar perfil: ' + error.message, false);
        } else {
            showNotification('Perfil atualizado com sucesso!');
        }
    } finally {
        hideLoading();
    }
});

// Alterar imagem de perfil
document.getElementById('changeImageBtn')?.addEventListener('click', () => {
    document.getElementById('imageUpload').click();
});

document.getElementById('imageUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const user = await checkAuth();
    if (!user) return;
    
    showLoading();
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-profile.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error } = await supabase.storage
            .from('profile-images')
            .upload(filePath, file, { upsert: true });
        
        if (error) {
            showNotification('Erro ao fazer upload da imagem: ' + error.message, false);
            return;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('profile-images')
            .getPublicUrl(filePath);
        
        const { error: updateError } = await supabase.auth.updateUser({
            data: { profile_image: publicUrl }
        });
        
        if (updateError) {
            showNotification('Erro ao atualizar perfil: ' + updateError.message, false);
        } else {
            document.getElementById('profileImage').src = publicUrl;
            showNotification('Imagem de perfil atualizada com sucesso!');
        }
    } finally {
        hideLoading();
    }
});

// Notas acadêmicas
async function loadNotes() {
    const user = await checkAuth();
    if (!user) return;
    
    const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    if (!error) {
        const notesContainer = document.getElementById('notesContainer');
        notesContainer.innerHTML = '';

        if (notes.length === 0) {
            notesContainer.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6 text-center">
                    <p class="text-gray-500">Nenhuma nota adicionada ainda</p>
                </div>
            `;
            return;
        }
        
        notes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'bg-white rounded-lg shadow-md p-4';
            noteElement.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold">${note.subject}</h3>
                        <p>Nota: ${note.grade}</p>
                        <p>Bimestre: ${note.semester}º</p>
                        <p>Motivo: ${note.reason}</p>
                    </div>
                    <button class="delete-note text-red-500" data-id="${note.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            notesContainer.appendChild(noteElement);
        });
        
        // Adicionar eventos para deletar notas
        document.querySelectorAll('.delete-note').forEach(button => {
            button.addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja excluir esta nota?')) {
                    const { error } = await supabase
                        .from('notes')
                        .delete()
                        .eq('id', button.dataset.id);
                        window.location.reload();
                    
                    if (!error) {
                        button.closest('div').remove();
                        generateReport();
                    }
                }
            });
        });
        
        generateReport();
    }
}

// Gerar relatório de notas
async function generateReport() {
    const user = await checkAuth();
    if (!user) return;
    
    const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id);
    
    if (!error) {
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = '';
        
        // Agrupar por matéria
        const subjects = {};
        notes.forEach(note => {
            if (!subjects[note.subject]) {
                subjects[note.subject] = [];
            }
            subjects[note.subject].push(note);
        });
        
        // Calcular totais
        let totalPoints = 0;
        const subjectElements = [];
        
        for (const subject in subjects) {
            const subjectNotes = subjects[subject];
            const subjectTotal = subjectNotes.reduce((sum, note) => sum + note.grade, 0);
            totalPoints += subjectTotal;
            
            const progress = (subjectTotal / 24) * 100;
            const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-blue-500';
            
            subjectElements.push(`
                <div class="mb-4">
                    <div class="flex justify-between mb-1">
                        <span>${subject}</span>
                        <span>${subjectTotal.toFixed(1)}/24 pontos</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="${progressColor} h-1.5 rounded-full" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>
            `);
        }
        
        const isApproved = totalPoints >= 24 * Object.keys(subjects).length;
        
        reportContainer.innerHTML = `
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-2">Progresso Geral</h3>
                ${subjectElements.join('')}
            </div>
            <div class="p-4 rounded-lg ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                <p class="font-semibold">${isApproved ? 'Parabéns! Você está aprovado!' : 'Atenção! Você ainda não atingiu a pontuação necessária.'}</p>
                <p>Total: ${totalPoints.toFixed(1)}/${24 * Object.keys(subjects).length} pontos</p>
            </div>
        `;
    }
}
// Adicionar nova nota
document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await checkAuth();
    if (!user) return;
    
    const subject = document.getElementById('subject').value;
    const grade = parseFloat(document.getElementById('grade').value);
    const semester = parseInt(document.getElementById('semester').value);
    const reason = document.getElementById('reason').value;
    
    if (isNaN(grade) || grade < 0 || grade > 10) {
        showNotification('Por favor, insira uma nota válida entre 0 e 10', false);
        return;
    }
    
    showLoading();
    try {
        const { error } = await supabase
            .from('notes')
            .insert([{
                user_id: user.id,
                subject,
                grade,
                semester,
                reason,
                created_at: new Date()
            }]);
        
        if (error) {
            showNotification('Erro ao adicionar nota: ' + error.message, false);
        } else {
            document.getElementById('noteForm').reset();
            loadNotes();
            showNotification('Nota adicionada com sucesso!');
        }
    } finally {
        hideLoading();
    }
});

// Inicialização da página
window.addEventListener('DOMContentLoaded', async () => {
    setupHamburgerMenu();
    setupLoginForm();
    setupRegisterForm();
    
    const user = await checkAuth();
    if (!user) return;
    
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'index.html':
            loadPosts();
            break;
        case 'profile.html':
            loadProfile();
            break;
        case 'notes.html':
            loadNotes();
            break;
    }
});
