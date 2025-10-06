import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test account credentials
const TEST_ACCOUNTS = [
  {
    email: 'test@projectgenie.dev',
    password: 'TestPass123!',
    full_name: 'Test User',
    role: 'Project Manager'
  },
  {
    email: 'pm@projectgenie.dev',
    password: 'PMPass123!',
    full_name: 'Priya Manager',
    role: 'Senior Project Manager'
  },
  {
    email: 'stakeholder@projectgenie.dev',
    password: 'StakePass123!',
    full_name: 'Steve Holder',
    role: 'Director of Operations'
  }
]

async function createTestAccounts() {
  console.log('🔐 Creating test accounts...')
  
  for (const account of TEST_ACCOUNTS) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          role: account.role
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User ${account.email} already exists`)
          
          // Get existing user
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users.find(u => u.email === account.email)
          
          if (existingUser) {
            // Update user profile
            const { error: profileError } = await supabase
              .from('users')
              .upsert({
                id: existingUser.id,
                email: account.email,
                full_name: account.full_name,
                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${account.full_name}`
              })
              
            if (!profileError) {
              console.log(`   ✅ Updated profile for ${account.email}`)
            }
          }
        } else {
          console.error(`   ❌ Error creating ${account.email}:`, authError.message)
        }
        continue
      }

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: account.email,
            full_name: account.full_name,
            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${account.full_name}`
          })

        if (profileError) {
          console.error(`   ❌ Error creating profile for ${account.email}:`, profileError.message)
        } else {
          console.log(`   ✅ Created account: ${account.email}`)
        }
      }
    } catch (error) {
      console.error(`   ❌ Unexpected error for ${account.email}:`, error)
    }
  }
}

async function createSampleProjects() {
  console.log('\n📁 Creating sample projects...')
  
  // Get test user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const testUser = users.find(u => u.email === 'test@projectgenie.dev')
  const pmUser = users.find(u => u.email === 'pm@projectgenie.dev')
  
  if (!testUser || !pmUser) {
    console.log('   ⚠️  Test users not found, skipping project creation')
    return
  }

  const sampleProjects = [
    {
      name: 'Customer Portal Redesign',
      description: 'Complete overhaul of the customer-facing portal with modern UI/UX',
      vision: 'Create a best-in-class customer experience that increases engagement and satisfaction',
      business_case: 'Current portal has 45% bounce rate. Redesign expected to reduce to 20% and increase conversions by 30%.',
      methodology_type: 'agile',
      owner_id: testUser.id,
      rag_status: 'green'
    },
    {
      name: 'Enterprise CRM Migration',
      description: 'Migrate from legacy CRM to Salesforce, including data migration and training',
      vision: 'Modernize our CRM capabilities to improve sales efficiency and customer insights',
      business_case: 'Legacy system costs $500k/year in maintenance. New system will save $300k annually and improve sales productivity by 25%.',
      methodology_type: 'prince2',
      owner_id: pmUser.id,
      rag_status: 'amber'
    },
    {
      name: 'Mobile App Development',
      description: 'Native iOS and Android apps for our SaaS platform',
      vision: 'Extend platform reach to mobile users, enabling work from anywhere',
      business_case: '60% of users request mobile access. Mobile app could increase user engagement by 40% and open new market segments.',
      methodology_type: 'hybrid',
      owner_id: testUser.id,
      rag_status: 'green'
    }
  ]

  for (const project of sampleProjects) {
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('name', project.name)
      .single()

    if (existingProject) {
      console.log(`   ⚠️  Project "${project.name}" already exists`)
      continue
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()

    if (error) {
      console.error(`   ❌ Error creating project "${project.name}":`, error.message)
    } else {
      console.log(`   ✅ Created project: ${project.name}`)
      
      // Add some sample tasks for Agile projects
      if (newProject && project.methodology_type === 'agile') {
        const tasks = [
          {
            project_id: newProject.id,
            title: 'Set up development environment',
            description: 'Configure local dev environment with all required tools',
            status: 'done',
            reporter_id: project.owner_id,
            priority: 1
          },
          {
            project_id: newProject.id,
            title: 'Design system architecture',
            description: 'Create high-level architecture diagrams and technical specifications',
            status: 'in_progress',
            reporter_id: project.owner_id,
            priority: 1
          },
          {
            project_id: newProject.id,
            title: 'Implement user authentication',
            description: 'Build secure login/logout functionality with OAuth support',
            status: 'todo',
            reporter_id: project.owner_id,
            priority: 2
          }
        ]

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasks)

        if (!tasksError) {
          console.log(`      📝 Added sample tasks`)
        }
      }

      // Add some sample risks
      const risks = [
        {
          project_id: newProject.id,
          title: 'Timeline delays due to resource availability',
          description: 'Key team members may be pulled to other priority projects',
          impact: 'high',
          probability: 'medium',
          mitigation_plan: 'Identify backup resources and create knowledge transfer documentation'
        },
        {
          project_id: newProject.id,
          title: 'Budget overrun',
          description: 'Complex requirements may require additional development time',
          impact: 'medium',
          probability: 'low',
          mitigation_plan: 'Weekly budget reviews and early escalation of scope changes'
        }
      ]

      const { error: risksError } = await supabase
        .from('risks')
        .insert(risks)

      if (!risksError) {
        console.log(`      ⚠️  Added sample risks`)
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting test data seed...\n')
  console.log('================================')
  console.log('Test Account Credentials:')
  console.log('================================')
  TEST_ACCOUNTS.forEach(account => {
    console.log(`📧 Email: ${account.email}`)
    console.log(`🔑 Password: ${account.password}`)
    console.log(`👤 Name: ${account.full_name}`)
    console.log('---')
  })
  console.log('================================\n')

  await createTestAccounts()
  await createSampleProjects()

  console.log('\n✨ Seed script completed!')
  console.log('\n💡 You can now login with any of the test accounts above')
  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})