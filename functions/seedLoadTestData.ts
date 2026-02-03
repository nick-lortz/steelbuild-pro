import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { logger } from './utils/logging.js';

/**
 * Load Test Data Seeder
 * Generates 1,000+ projects, 5,000+ RFIs, realistic tasks, financials
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);
    
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { projectCount = 100, rfisPerProject = 5, tasksPerProject = 20 } = await req.json();
    
    logger.info('seedLoadTestData', 'Starting load test seed', { projectCount, rfisPerProject, tasksPerProject });

    const projectStatuses = ['bidding', 'awarded', 'in_progress', 'on_hold', 'completed'];
    const phases = ['detailing', 'fabrication', 'erection', 'closeout'];
    const rfiStatuses = ['draft', 'submitted', 'under_review', 'answered', 'closed'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    
    // Generate projects in batches
    const batchSize = 50;
    const projectBatches = Math.ceil(projectCount / batchSize);
    let totalProjects = 0;
    let totalRFIs = 0;
    let totalTasks = 0;

    for (let batch = 0; batch < projectBatches; batch++) {
      const batchStart = Date.now();
      const count = Math.min(batchSize, projectCount - batch * batchSize);
      
      const projects = Array.from({ length: count }, (_, i) => {
        const idx = batch * batchSize + i;
        const startDate = new Date(2025, 0, 1 + (idx % 365));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6 + (idx % 12));
        
        return {
          project_number: `LT-${String(idx + 1).padStart(4, '0')}`,
          name: `Load Test Project ${idx + 1}`,
          client: `Client ${(idx % 20) + 1}`,
          location: `Site ${(idx % 50) + 1}`,
          status: projectStatuses[idx % projectStatuses.length],
          phase: phases[idx % phases.length],
          contract_value: 500000 + (idx * 50000),
          start_date: startDate.toISOString().split('T')[0],
          target_completion: endDate.toISOString().split('T')[0],
          project_manager: user.email,
          assigned_users: [user.email]
        };
      });

      const createdProjects = await base44.asServiceRole.entities.Project.bulkCreate(projects);
      totalProjects += createdProjects.length;
      
      logger.info('seedLoadTestData', `Batch ${batch + 1}/${projectBatches} projects created`, {
        count: createdProjects.length,
        duration: Date.now() - batchStart
      });

      // Generate RFIs for each project
      const rfiBatchStart = Date.now();
      const rfis = [];
      
      for (const project of createdProjects) {
        for (let r = 0; r < rfisPerProject; r++) {
          const submittedDate = new Date(project.start_date);
          submittedDate.setDate(submittedDate.getDate() + (r * 7));
          
          rfis.push({
            project_id: project.id,
            rfi_number: r + 1,
            subject: `RFI ${r + 1} - Load Test`,
            question: `This is a load test RFI question for testing purposes. Project: ${project.project_number}`,
            status: rfiStatuses[r % rfiStatuses.length],
            priority: priorities[r % priorities.length],
            ball_in_court: r % 2 === 0 ? 'internal' : 'external',
            submitted_date: submittedDate.toISOString().split('T')[0],
            rfi_type: 'other',
            category: 'structural'
          });
        }
      }

      if (rfis.length > 0) {
        await base44.asServiceRole.entities.RFI.bulkCreate(rfis);
        totalRFIs += rfis.length;
        logger.info('seedLoadTestData', `Batch ${batch + 1} RFIs created`, {
          count: rfis.length,
          duration: Date.now() - rfiBatchStart
        });
      }

      // Generate tasks for each project
      const taskBatchStart = Date.now();
      const tasks = [];
      
      for (const project of createdProjects) {
        const projectStart = new Date(project.start_date);
        
        for (let t = 0; t < tasksPerProject; t++) {
          const taskStart = new Date(projectStart);
          taskStart.setDate(taskStart.getDate() + (t * 3));
          const taskEnd = new Date(taskStart);
          taskEnd.setDate(taskEnd.getDate() + 5);
          
          tasks.push({
            project_id: project.id,
            name: `Load Test Task ${t + 1}`,
            phase: phases[t % phases.length],
            start_date: taskStart.toISOString().split('T')[0],
            end_date: taskEnd.toISOString().split('T')[0],
            duration_days: 5,
            status: t % 3 === 0 ? 'completed' : t % 3 === 1 ? 'in_progress' : 'not_started',
            progress_percent: t % 3 === 0 ? 100 : t % 3 === 1 ? 50 : 0,
            estimated_hours: 40,
            actual_hours: t % 3 === 0 ? 45 : t % 3 === 1 ? 20 : 0
          });
        }
      }

      if (tasks.length > 0) {
        await base44.asServiceRole.entities.Task.bulkCreate(tasks);
        totalTasks += tasks.length;
        logger.info('seedLoadTestData', `Batch ${batch + 1} tasks created`, {
          count: tasks.length,
          duration: Date.now() - taskBatchStart
        });
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('seedLoadTestData', 'Load test seed completed', {
      totalProjects,
      totalRFIs,
      totalTasks,
      duration
    });

    return Response.json({
      success: true,
      stats: {
        projects: totalProjects,
        rfis: totalRFIs,
        tasks: totalTasks,
        duration_ms: duration,
        duration_sec: Math.round(duration / 1000)
      }
    });

  } catch (error) {
    logger.error('seedLoadTestData', 'Seed failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});