const STORAGE_KEY = 'pht_projects';

// --- Data Management ---

function getProjects() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function addProject(project) {
    const projects = getProjects();
    project.status = 'active'; // Default status
    projects.push(project);
    saveProjects(projects);
}

function archiveProject(id) {
    if (!confirm('¿Estás seguro de que deseas finalizar este proyecto? Se moverá al histórico.')) return;

    const projects = getProjects();
    const project = projects.find(p => p.id === id);
    if (project) {
        project.status = 'closed';
        saveProjects(projects);
        renderDashboard();
    }
}

function getProjectById(id) {
    const projects = getProjects();
    return projects.find(p => p.id === id);
}

function updateProject(updatedProject) {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
        projects[index] = updatedProject;
        saveProjects(projects);
    }
}

// --- Logic & Calculations ---

function calculateDimensionAverage(subdimensions) {
    const values = Object.values(subdimensions).map(Number);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
}

function getLatestRating(project) {
    if (!project.ratings || project.ratings.length === 0) return null;
    // Sort by week descending (assuming ISO week format YYYY-Www)
    return project.ratings.sort((a, b) => b.week.localeCompare(a.week))[0];
}

function getTrafficLightStatus(score) {
    score = Number(score);
    if (score >= 4) return 'good';
    if (score >= 3) return 'warning';
    return 'critical';
}

function getStatusLabel(status) {
    switch (status) {
        case 'good': return 'Saludable';
        case 'warning': return 'En Riesgo';
        case 'critical': return 'Crítico';
        default: return 'N/A';
    }
}

// --- Rendering ---

function populateFilters() {
    const projects = getProjects();

    // Helpers
    const getUnique = (key) => [...new Set(projects.map(p => p[key]).filter(Boolean))].sort();
    const getYears = () => {
        const years = new Set();
        projects.forEach(p => p.ratings?.forEach(r => years.add(r.week.split('-')[0])));
        return [...years].sort().reverse();
    };

    const populate = (id, values) => {
        const select = document.getElementById(id);
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Todos</option>';
        values.forEach(v => {
            const option = document.createElement('option');
            option.value = v;
            option.textContent = v;
            select.appendChild(option);
        });
        select.value = current;
    };

    populate('filter-year', getYears());
    populate('filter-delivery', getUnique('delivery'));
    populate('filter-leader', getUnique('leader'));
    populate('filter-tech', getUnique('techLead'));
}

let showArchived = false;

function toggleArchived() {
    showArchived = !showArchived;
    const btn = document.getElementById('toggle-archived');
    if (btn) {
        btn.textContent = showArchived ? '📂 Ver Activos' : '📂 Ver Histórico';
        btn.classList.toggle('btn-primary', showArchived);
        btn.classList.toggle('btn-secondary', !showArchived);
    }
    renderDashboard();
}

function renderDashboard() {
    const tableBody = document.getElementById('project-table-body');
    if (!tableBody) return;

    let projects = getProjects();

    // Filter by Status
    const targetStatus = showArchived ? 'closed' : 'active';
    // Handle legacy projects without status (treat as active)
    projects = projects.filter(p => (p.status || 'active') === targetStatus);

    // --- Filtering ---
    const yearFilter = document.getElementById('filter-year')?.value;
    const deliveryFilter = document.getElementById('filter-delivery')?.value;
    const leaderFilter = document.getElementById('filter-leader')?.value;
    const techFilter = document.getElementById('filter-tech')?.value;

    if (yearFilter) projects = projects.filter(p => p.ratings?.some(r => r.week.startsWith(yearFilter)));
    if (deliveryFilter) projects = projects.filter(p => p.delivery === deliveryFilter);
    if (leaderFilter) projects = projects.filter(p => p.leader === leaderFilter);
    if (techFilter) projects = projects.filter(p => p.techLead === techFilter);

    // --- Stats Calculation ---
    const totalProjects = projects.length;
    let totalScoreSum = 0;
    let ratedProjectsCount = 0;
    let riskCount = 0;

    projects.forEach(p => {
        const latest = getLatestRating(p);

        let relevantRating = latest;
        if (yearFilter && latest && !latest.week.startsWith(yearFilter)) {
            relevantRating = p.ratings
                .filter(r => r.week.startsWith(yearFilter))
                .sort((a, b) => b.week.localeCompare(a.week))[0];
        }

        if (relevantRating) {
            const dimScores = Object.values(relevantRating.dimensions).map(Number);
            const overall = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;
            totalScoreSum += overall;
            ratedProjectsCount++;

            if (overall < 4) riskCount++;
        }
    });

    const avgHealth = ratedProjectsCount > 0 ? (totalScoreSum / ratedProjectsCount).toFixed(1) : '-';

    // Update Stats DOM
    if (document.getElementById('stat-total')) {
        document.getElementById('stat-total').textContent = totalProjects;
        document.getElementById('stat-avg').textContent = avgHealth;
        document.getElementById('stat-risk').textContent = riskCount;

        const avgIndicator = document.getElementById('stat-avg-indicator');
        if (avgHealth !== '-') {
            const status = getTrafficLightStatus(avgHealth);
            avgIndicator.className = `traffic-light status-${status}`;
            avgIndicator.style.display = 'block';
        } else {
            avgIndicator.style.display = 'none';
        }
    }

    // --- Chart Rendering ---
    if (typeof renderTrendChart === 'function') {
        renderTrendChart(projects, yearFilter);
    }

    if (projects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem;">
                    <h3 style="color: var(--text-muted);">No se encontraron proyectos ${showArchived ? 'cerrados' : 'activos'}</h3>
                    <p style="color: var(--text-muted);">Intenta ajustar los filtros.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = projects.map(project => {
        let latestRating = getLatestRating(project);

        if (yearFilter && latestRating && !latestRating.week.startsWith(yearFilter)) {
            latestRating = project.ratings
                .filter(r => r.week.startsWith(yearFilter))
                .sort((a, b) => b.week.localeCompare(a.week))[0];
        }

        let overallScore = '-';
        let overallStatus = 'none';
        let dims = { 'EN': '-', 'EQ': '-', 'SH': '-', 'VA': '-', 'RI': '-' };
        let dimStatuses = { 'EN': 'none', 'EQ': 'none', 'SH': 'none', 'VA': 'none', 'RI': 'none' };

        if (latestRating) {
            const dimScores = Object.values(latestRating.dimensions).map(Number);
            overallScore = (dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(1);
            overallStatus = getTrafficLightStatus(overallScore);

            Object.keys(dims).forEach(key => {
                const val = latestRating.dimensions[key];
                if (val) {
                    dims[key] = val;
                    dimStatuses[key] = getTrafficLightStatus(val);
                }
            });
        }

        const actionBtn = showArchived
            ? `<span style="color: var(--text-muted); font-size: 0.875rem;">Cerrado</span>`
            : `<button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-right: 0.5rem;" onclick="archiveProject('${project.id}')">Cerrar</button>`;

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: var(--primary-dark);">${project.name}</div>
                </td>
                <td style="color: var(--text-muted);">${project.client}</td>
                
                <td style="text-align: center;">
                    <span class="score-pill ${dimStatuses['EN']}">${dims['EN']}</span>
                </td>
                <td style="text-align: center;">
                    <span class="score-pill ${dimStatuses['EQ']}">${dims['EQ']}</span>
                </td>
                <td style="text-align: center;">
                    <span class="score-pill ${dimStatuses['SH']}">${dims['SH']}</span>
                </td>
                <td style="text-align: center;">
                    <span class="score-pill ${dimStatuses['VA']}">${dims['VA']}</span>
                </td>
                <td style="text-align: center;">
                    <span class="score-pill ${dimStatuses['RI']}">${dims['RI']}</span>
                </td>
                
                <td style="text-align: center;">
                    <span class="score-pill ${overallStatus}" style="font-weight: 700;">${overallScore}</span>
                </td>
                
                <td style="text-align: right; white-space: nowrap;">
                    ${actionBtn}
                    <a href="details.html?id=${project.id}" style="color: var(--accent-blue); text-decoration: none; font-weight: 500; font-size: 0.875rem;">
                        Ver Detalles &rarr;
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Check which page we are on
    if (document.getElementById('project-table-body')) {
        populateFilters();
        renderDashboard();

        // Attach listeners
        ['filter-year', 'filter-delivery', 'filter-leader', 'filter-tech'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', renderDashboard);
        });

        const toggleBtn = document.getElementById('toggle-archived');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleArchived);
        }
    }

    const createForm = document.getElementById('create-project-form');
    if (createForm) {
        // Check for edit mode
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('id');

        if (editId) {
            const project = getProjectById(editId);
            if (project) {
                document.querySelector('h1').textContent = 'Editar Proyecto';
                document.querySelector('button[type="submit"]').textContent = 'Guardar Cambios';

                // Populate fields
                if (createForm.elements['name']) createForm.elements['name'].value = project.name;
                if (createForm.elements['client']) createForm.elements['client'].value = project.client;
                if (createForm.elements['leader']) createForm.elements['leader'].value = project.leader;
                if (createForm.elements['delivery']) createForm.elements['delivery'].value = project.delivery || '';
                if (createForm.elements['techLead']) createForm.elements['techLead'].value = project.techLead || '';
            }
        }

        createForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(createForm);

            if (editId) {
                // Update existing
                const project = getProjectById(editId);
                if (project) {
                    project.name = formData.get('name');
                    project.client = formData.get('client');
                    project.leader = formData.get('leader');
                    project.delivery = formData.get('delivery');
                    project.techLead = formData.get('techLead');

                    updateProject(project);
                    alert('Proyecto actualizado correctamente');
                    window.location.href = `details.html?id=${editId}`;
                }
            } else {
                // Create new
                const newProject = {
                    id: Date.now().toString(), // Simple ID generation
                    name: formData.get('name'),
                    client: formData.get('client'),
                    leader: formData.get('leader'),
                    delivery: formData.get('delivery'),
                    techLead: formData.get('techLead'),
                    ratings: []
                };

                addProject(newProject);
                window.location.href = 'index.html';
            }
        });
    }

    // Details Page Logic
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (projectId && document.getElementById('project-header')) {
        const project = getProjectById(projectId);
        if (!project) {
            alert('Proyecto no encontrado');
            window.location.href = 'index.html';
            return;
        }

        // Render Header
        document.getElementById('project-name').textContent = project.name;
        document.getElementById('project-meta').innerHTML = `
            ${project.client} <br>
            <span style="font-size: 0.9em; opacity: 0.9;">
                Delivery: ${project.delivery || '-'} | Técnico: ${project.techLead || '-'} | Líder: ${project.leader}
            </span>
        `;

        // Set Edit Link
        const editBtn = document.getElementById('edit-project-btn');
        if (editBtn) {
            editBtn.href = `create.html?id=${project.id}`;
        }

        // Define Dimensions
        const DIMENSIONS = {
            'EN': {
                label: 'Entrega',
                subs: ['Cumplimiento de cronograma', 'Velocidad y predictibilidad', 'Calidad de entregables', 'Claridad de definición de backlog y done']
            },
            'EQ': {
                label: 'Equipo',
                subs: ['Capacidad y balance', 'Motivación y moral', 'Carga de trabajo', 'Seguridad psicológica']
            },
            'SH': {
                label: 'Stakeholders',
                subs: ['Satisfacción', 'Alineamiento en alcance', 'Comunicación', 'Confianza']
            },
            'VA': {
                label: 'Valor',
                subs: ['Métricas de éxito', 'Evidencia de valor', 'Adopción temprana', 'Conexión con caso de negocio']
            },
            'RI': {
                label: 'Riesgos',
                subs: ['Riesgos técnicos y funcionales', 'Dependencias externas', 'Recursos', 'Deuda técnica']
            }
        };

        // Render Form
        const container = document.getElementById('dimensions-container');
        container.innerHTML = Object.entries(DIMENSIONS).map(([key, data]) => `
            <div class="rating-group">
                <div class="dimension-header">
                    <h3>${data.label}</h3>
                    <span class="dimension-score" id="score-${key}">-</span>
                </div>
                ${data.subs.map((sub, idx) => `
                    <div class="subdimension-row" style="flex-direction: column; align-items: stretch;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <label style="flex: 1; font-size: 0.9rem;" title="1 no cumple, 5 cumple completamente">${sub}</label>
                            <div style="display: flex; align-items: center; gap: 10px; width: 200px;">
                                <input type="range" class="range-slider" name="${key}_${idx}" min="1" max="5" step="1" value="3" oninput="updateDimensionScore('${key}')" title="1 no cumple, 5 cumple completamente"><span class="tooltip" title="1 no cumple, 5 cumple completamente">ℹ️</span>
                                <span class="rating-value" id="val-${key}_${idx}">3</span>
                            </div>
                        </div>
                        <textarea 
                            name="${key}_${idx}_justification" 
                            placeholder="Justificación de la nota (opcional, máx. 1500 caracteres)..." 
                            maxlength="1500"
                            style="width: 100%; min-height: 60px; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem; resize: vertical;"
                        ></textarea>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Set default week to current week
        const today = new Date();
        const weekNum = getWeekNumber(today);
        document.getElementById('week').value = `${today.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;

        // Render History
        renderHistory(project);

        // Form Submit
        document.getElementById('rating-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const week = formData.get('week');

            const newRating = {
                week: week,
                dimensions: {},
                subdimensions: {},
                justifications: {}
            };

            Object.keys(DIMENSIONS).forEach(key => {
                let sum = 0;
                let count = 0;
                DIMENSIONS[key].subs.forEach((sub, idx) => {
                    const val = parseInt(formData.get(`${key}_${idx}`));
                    const justification = formData.get(`${key}_${idx}_justification`) || '';
                    newRating.subdimensions[`${key}_${idx}`] = val;
                    newRating.justifications[`${key}_${idx}`] = justification;
                    sum += val;
                    count++;
                });
                newRating.dimensions[key] = (sum / count).toFixed(1);
            });

            // Check if rating for this week already exists, replace it
            const existingIdx = project.ratings.findIndex(r => r.week === week);
            if (existingIdx !== -1) {
                if (!confirm('Ya existe una evaluación para esta semana. ¿Deseas sobrescribirla?')) return;
                project.ratings[existingIdx] = newRating;
            } else {
                project.ratings.push(newRating);
            }

            updateProject(project);
            renderHistory(project);
            alert('Evaluación guardada correctamente');
            window.location.href = 'index.html'; // Redirect to dashboard
        });

        // Expose update function to global scope for oninput
        window.updateDimensionScore = (key) => {
            const inputs = document.querySelectorAll(`input[name^="${key}_"]`);
            let sum = 0;
            inputs.forEach(input => {
                sum += parseInt(input.value);
                document.getElementById(`val-${input.name}`).textContent = input.value;
            });
            const avg = (sum / inputs.length).toFixed(1);
            document.getElementById(`score-${key}`).textContent = avg;
        };

        // Initialize scores
        Object.keys(DIMENSIONS).forEach(key => window.updateDimensionScore(key));
    }
});

function renderHistory(project) {
    const grid = document.getElementById('history-grid');
    if (!grid) return;

    // Sort ratings by week desc
    const sortedRatings = [...project.ratings].sort((a, b) => b.week.localeCompare(a.week));

    grid.innerHTML = sortedRatings.map(rating => {
        const dimScores = Object.values(rating.dimensions).map(Number);
        const overall = (dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(1);
        const status = getTrafficLightStatus(overall);

        return `
            <div class="history-card">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="traffic-light status-${status}" style="width: 16px; height: 16px;"></div>
                    <div>
                        <div style="font-weight: 600;">Semana ${rating.week}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">Score: ${overall}</div>
                    </div>
                </div>
                <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;" onclick="openRatingDetails('${rating.week}')">
                    Ver Detalles
                </button>
            </div>
        `;
    }).join('');
}

// --- Modal Logic ---

function openRatingDetails(week) {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    const project = getProjectById(projectId);

    if (!project) return;

    const rating = project.ratings.find(r => r.week === week);
    if (!rating) return;

    const modal = document.getElementById('rating-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = `Detalles Semana ${week}`;

    // Generate Details HTML
    const dims = {
        'EN': 'Entrega',
        'EQ': 'Equipo',
        'SH': 'Stakeholders',
        'VA': 'Valor',
        'RI': 'Riesgos'
    };

    let content = '';

    // Overall Score
    const dimScores = Object.values(rating.dimensions).map(Number);
    const overall = (dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(1);
    const overallStatus = getTrafficLightStatus(overall);

    content += `
        <div style="display: flex; align-items: center; justify-content: center; flex-direction: column; margin-bottom: 2rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Salud General</div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 2.5rem; font-weight: 700; color: var(--primary-dark);">${overall}</span>
                <span class="score-badge ${overallStatus}">${getStatusLabel(overallStatus)}</span>
            </div>
        </div>
    `;

    // Dimensions with subdimension details
    const DIMENSIONS = {
        'EN': {
            label: 'Entrega',
            subs: ['Cumplimiento de cronograma', 'Velocidad y predictibilidad', 'Calidad de entregables', 'Claridad de definición de backlog y done']
        },
        'EQ': {
            label: 'Equipo',
            subs: ['Capacidad y balance', 'Motivación y moral', 'Carga de trabajo', 'Seguridad psicológica']
        },
        'SH': {
            label: 'Stakeholders',
            subs: ['Satisfacción', 'Alineamiento en alcance', 'Comunicación', 'Confianza']
        },
        'VA': {
            label: 'Valor',
            subs: ['Métricas de éxito', 'Evidencia de valor', 'Adopción temprana', 'Conexión con caso de negocio']
        },
        'RI': {
            label: 'Riesgos',
            subs: ['Riesgos técnicos y funcionales', 'Dependencias externas', 'Recursos', 'Deuda técnica']
        }
    };

    content += '<div style="display: flex; flex-direction: column; gap: 1rem;">';

    Object.entries(DIMENSIONS).forEach(([key, data]) => {
        const dimScore = rating.dimensions[key];
        const dimStatus = getTrafficLightStatus(dimScore);

        content += `
            <div style="border: 1px solid #edf2f7; border-radius: 8px; padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #edf2f7; padding-bottom: 0.5rem;">
                    <h4 style="margin: 0;">${data.label}</h4>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600;">${dimScore}</span>
                        <span class="traffic-light status-${dimStatus}"></span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        `;

        data.subs.forEach((subLabel, idx) => {
            const subKey = `${key}_${idx}`;
            const subScore = rating.subdimensions?.[subKey] || '-';
            const justification = rating.justifications?.[subKey] || '';
            const subStatus = subScore !== '-' ? getTrafficLightStatus(subScore) : 'none';

            content += `
                <div style="background: #f8fafc; padding: 0.75rem; border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${justification ? '0.5rem' : '0'};">
                        <span style="font-size: 0.875rem;">${subLabel}</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: 600; font-size: 0.875rem;">${subScore}</span>
                            <span class="traffic-light status-${subStatus}" style="width: 10px; height: 10px;"></span>
                        </div>
                    </div>
                    ${justification ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin: 0; font-style: italic;">"${justification}"</p>` : ''}
                </div>
            `;
        });

        content += '</div></div>';
    });

    content += '</div>';

    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('rating-modal');
    modal.classList.remove('active');
}

// Expose to window for onclick handlers
window.openRatingDetails = openRatingDetails;
window.closeModal = closeModal;

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function renderTrendChart(projects, yearFilter = null) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // 1. Collect all unique weeks from all projects
    const allWeeks = new Set();
    projects.forEach(p => {
        if (p.ratings) {
            p.ratings.forEach(r => {
                if (!yearFilter || r.week.startsWith(yearFilter)) {
                    allWeeks.add(r.week);
                }
            });
        }
    });

    // Sort weeks
    let sortedWeeks = Array.from(allWeeks).sort();

    // If no year filter, take last 12. If year filter, take all from that year.
    if (!yearFilter) {
        sortedWeeks = sortedWeeks.slice(-12);
    }

    // 2. Prepare Datasets
    const datasets = [];
    const colors = ['#3182ce', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

    // Dataset 1: Portfolio Average (Thick Line)
    const avgDataPoints = sortedWeeks.map(week => {
        let sum = 0;
        let count = 0;
        projects.forEach(p => {
            const rating = p.ratings ? p.ratings.find(r => r.week === week) : null;
            if (rating) {
                const dimScores = Object.values(rating.dimensions).map(Number);
                const overall = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;
                sum += overall;
                count++;
            }
        });
        return count > 0 ? (sum / count).toFixed(2) : null;
    });

    datasets.push({
        label: 'Promedio Portafolio',
        data: avgDataPoints,
        borderColor: '#1e3a5f',
        backgroundColor: 'rgba(30, 58, 95, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 0
    });

    // Dataset 2...N: Individual Projects
    projects.forEach((p, index) => {
        const projectData = sortedWeeks.map(week => {
            const rating = p.ratings ? p.ratings.find(r => r.week === week) : null;
            if (rating) {
                const dimScores = Object.values(rating.dimensions).map(Number);
                return (dimScores.reduce((a, b) => a + b, 0) / dimScores.length).toFixed(2);
            }
            return null;
        });

        const color = colors[index % colors.length];
        datasets.push({
            label: p.name,
            data: projectData,
            borderColor: color,
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: color,
            pointRadius: 4
        });
    });

    // 3. Render Chart
    if (window.myTrendChart) {
        window.myTrendChart.destroy();
    }

    window.myTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedWeeks,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    min: 1,
                    max: 5,
                    grid: {
                        color: '#f1f5f9'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            }
        }
    });
}
