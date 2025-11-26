import { memesAPI } from '../api.js';
import { navigateTo, updateQueryParams } from '../router.js';

export function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

export function setFormSubmitting(form, submitting) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, textarea, button');
    
    if (submitting) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
        inputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Сохранить';
        inputs.forEach(input => input.disabled = false);
    }
}

export async function renderItems({ query }) {
    const app = document.getElementById('app');
    const search = query.search || '';
    
    try {
        const response = await memesAPI.getItems(search);
        const memes = response.data;
        
        if (memes.length === 0) {
            app.innerHTML = `
                <div class="empty">
                    <h2>Мемы не найдены</h2>
                    <p>${search ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первый мем в коллекцию!'}</p>
                    ${!search ? '<a href="#/new" class="btn btn-primary">Добавить мем</a>' : ''}
                </div>
            `;
            return;
        }
        
        app.innerHTML = `
            <div class="search-container">
                <input 
                    type="text" 
                    class="search-input" 
                    placeholder="Поиск по названию, описанию или тегам..."
                    value="${search}"
                    id="searchInput"
                >
            </div>
            <div class="items-grid">
                ${memes.map(meme => `
                    <div class="item-card" onclick="location.hash='#/items/${meme.id}'">
                        <img src="${meme.image}" alt="${meme.title}" onerror="this.src='https://via.placeholder.com/400x300/ccc/white?text=No+Image'">
                        <div class="item-card-content">
                            <h3>${escapeHtml(meme.title)}</h3>
                            <p>${escapeHtml(meme.description)}</p>
                            <div style="margin-top: 0.5rem;">
                                ${meme.tags.map(tag => `<span style="background: #ecf0f1; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-right: 0.3rem;">${escapeHtml(tag)}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                updateQueryParams({ search: e.target.value.trim() });
            }, 500);
        });
        
    } catch (error) {
        console.error('Error loading items:', error);
        app.innerHTML = `
            <div class="error">
                <h2>Ошибка загрузки</h2>
                <p>${error.message}</p>
                <button onclick="location.hash='#/items'" class="btn btn-primary">Попробовать снова</button>
            </div>
        `;
    }
}

export async function renderItemDetail({ params }) {
    const app = document.getElementById('app');
    
    try {
        const response = await memesAPI.getItem(params.id);
        const meme = response.data;
        
        app.innerHTML = `
            <div class="item-detail">
                <img src="${meme.image}" alt="${meme.title}" class="item-detail-image" onerror="this.src='https://via.placeholder.com/800x400/ccc/white?text=No+Image'">
                <div class="item-detail-content">
                    <h2>${escapeHtml(meme.title)}</h2>
                    <p>${escapeHtml(meme.description)}</p>
                    <div style="margin-bottom: 1.5rem;">
                        <strong>Теги:</strong>
                        ${meme.tags.map(tag => `<span style="background: #ecf0f1; padding: 0.3rem 0.7rem; border-radius: 15px; font-size: 0.9rem; margin-right: 0.5rem;">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div style="color: #7f8c8d; font-size: 0.9rem;">
                        Добавлен: ${meme.createdAt}
                    </div>
                    <div class="item-detail-actions">
                        <a href="#/items" class="btn btn-secondary">Назад к списку</a>
                        <a href="#/items/${meme.id}/edit" class="btn btn-primary">Редактировать</a>
                        <button onclick="deleteMeme(${meme.id})" class="btn btn-danger">Удалить</button>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading item:', error);
        app.innerHTML = `
            <div class="error">
                <h2>Ошибка загрузки</h2>
                <p>${error.message}</p>
                <a href="#/items" class="btn btn-primary">Вернуться к списку</a>
            </div>
        `;
    }
}

export async function renderItemNew() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="form-container">
            <h2>Добавить новый мем</h2>
            <form id="newMemeForm">
                <div class="form-group">
                    <label for="title">Название *</label>
                    <input type="text" id="title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="description">Описание *</label>
                    <textarea id="description" name="description" required></textarea>
                </div>
                <div class="form-group">
                    <label for="image">URL изображения</label>
                    <input type="url" id="image" name="image" placeholder="https://example.com/image.jpg">
                </div>
                <div class="form-group">
                    <label for="tags">Теги (через запятую)</label>
                    <input type="text" id="tags" name="tags" placeholder="funny, programming, cats">
                </div>
                <div class="form-actions">
                    <a href="#/items" class="btn btn-secondary">Отмена</a>
                    <button type="submit" class="btn btn-primary">Добавить мем</button>
                </div>
            </form>
        </div>
    `;
    
    const form = document.getElementById('newMemeForm');
    form.addEventListener('submit', handleCreateSubmit);
}

export async function renderItemEdit({ params }) {
    const app = document.getElementById('app');
    
    try {
        const response = await memesAPI.getItem(params.id);
        const meme = response.data;
        
        app.innerHTML = `
            <div class="form-container">
                <h2>Редактировать мем</h2>
                <form id="editMemeForm">
                    <div class="form-group">
                        <label for="title">Название *</label>
                        <input type="text" id="title" name="title" value="${escapeHtml(meme.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="description">Описание *</label>
                        <textarea id="description" name="description" required>${escapeHtml(meme.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="image">URL изображения</label>
                        <input type="url" id="image" name="image" value="${escapeHtml(meme.image)}">
                    </div>
                    <div class="form-group">
                        <label for="tags">Теги (через запятую)</label>
                        <input type="text" id="tags" name="tags" value="${meme.tags.join(', ')}" placeholder="funny, programming, cats">
                    </div>
                    <div class="form-actions">
                        <a href="#/items/${meme.id}" class="btn btn-secondary">Отмена</a>
                        <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                    </div>
                </form>
            </div>
        `;
        
        const form = document.getElementById('editMemeForm');
        form.addEventListener('submit', (e) => handleUpdateSubmit(e, meme.id));
        
    } catch (error) {
        console.error('Error loading item for edit:', error);
        app.innerHTML = `
            <div class="error">
                <h2>Ошибка загрузки</h2>
                <p>${error.message}</p>
                <a href="#/items" class="btn btn-primary">Вернуться к списку</a>
            </div>
        `;
    }
}

async function handleCreateSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const itemData = {
        title: formData.get('title'),
        description: formData.get('description'),
        image: formData.get('image'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };
    
    try {
        setFormSubmitting(form, true);
        await memesAPI.createItem(itemData);
        showNotification('Мем успешно добавлен!');
        navigateTo('#/items');
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Create error:', error);
    } finally {
        setFormSubmitting(form, false);
    }
}

async function handleUpdateSubmit(e, id) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const itemData = {
        title: formData.get('title'),
        description: formData.get('description'),
        image: formData.get('image'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : []
    };
    
    try {
        setFormSubmitting(form, true);
        await memesAPI.updateItem(id, itemData);
        showNotification('Мем успешно обновлен!');
        navigateTo(`#/items/${id}`);
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Update error:', error);
    } finally {
        setFormSubmitting(form, false);
    }
}

window.deleteMeme = async function(id) {
    if (!confirm('Вы уверены, что хотите удалить этот мем?')) {
        return;
    }
    
    try {
        await memesAPI.deleteItem(id);
        showNotification('Мем успешно удален!');
        navigateTo('#/items');
    } catch (error) {
        showNotification(error.message, 'error');
        console.error('Delete error:', error);
    }
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}