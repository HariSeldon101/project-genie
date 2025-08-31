#!/usr/bin/env tsx

/**
 * Automated Test Suite Runner for Document Generation
 * 
 * This script runs all document generation tests in sequence
 * and provides a comprehensive report of the results.
 * 
 * Usage: npm run test:docs
 */

import { spawn } from 'child_process'
import { performance } from 'perf_hooks'
import chalk from 'chalk'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
}

class TestSuiteRunner {
  private results: TestResult[] = []
  private startTime: number = 0
  
  async run() {
    console.log(chalk.blue.bold('\n🧪 Document Generation Test Suite\n'))
    console.log(chalk.gray('=' .repeat(60)))
    
    this.startTime = performance.now()
    
    // Run tests in sequence
    await this.runTestGroup('Unit Tests', 'npm run test:unit')
    await this.runTestGroup('Integration Tests', 'npm run test:integration')
    await this.runTestGroup('End-to-End Tests', 'npm run test:e2e')
    
    // Generate report
    this.generateReport()
  }
  
  private async runTestGroup(name: string, command: string): Promise<void> {
    console.log(chalk.yellow(`\n📁 Running ${name}...`))
    
    const testStart = performance.now()
    
    try {
      await this.executeCommand(command)
      
      const duration = (performance.now() - testStart) / 1000
      this.results.push({
        name,
        passed: true,
        duration
      })
      
      console.log(chalk.green(`✅ ${name} passed (${duration.toFixed(2)}s)`))
    } catch (error) {
      const duration = (performance.now() - testStart) / 1000
      this.results.push({
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      console.log(chalk.red(`❌ ${name} failed (${duration.toFixed(2)}s)`))
      console.log(chalk.red(`   Error: ${error}`))
    }
  }
  
  private executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ')
      const child = spawn(cmd, args, {
        stdio: 'pipe',
        shell: true
      })
      
      let output = ''
      let errorOutput = ''
      
      child.stdout?.on('data', (data) => {
        output += data.toString()
        // Show test progress
        if (data.toString().includes('✓') || data.toString().includes('✗')) {
          process.stdout.write(chalk.gray(data.toString()))
        }
      })
      
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(errorOutput || `Process exited with code ${code}`))
        }
      })
      
      child.on('error', reject)
    })
  }
  
  private generateReport() {
    const totalDuration = (performance.now() - this.startTime) / 1000
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.filter(r => !r.passed).length
    
    console.log(chalk.gray('\n' + '=' .repeat(60)))
    console.log(chalk.blue.bold('\n📊 Test Results Summary\n'))
    
    // Results table
    console.log(chalk.white('Test Group                  Status      Duration'))
    console.log(chalk.gray('-'.repeat(50)))
    
    this.results.forEach(result => {
      const status = result.passed 
        ? chalk.green('PASSED') 
        : chalk.red('FAILED')
      const name = result.name.padEnd(25)
      const duration = `${result.duration.toFixed(2)}s`.padStart(8)
      
      console.log(`${name} ${status}     ${duration}`)
    })
    
    console.log(chalk.gray('-'.repeat(50)))
    
    // Summary stats
    console.log(chalk.white('\n📈 Statistics:'))
    console.log(`  Total Tests: ${chalk.cyan(this.results.length)}`)
    console.log(`  Passed: ${chalk.green(passedTests)}`)
    console.log(`  Failed: ${chalk.red(failedTests)}`)
    console.log(`  Duration: ${chalk.yellow(totalDuration.toFixed(2) + 's')}`)
    console.log(`  Success Rate: ${chalk.cyan(((passedTests / this.results.length) * 100).toFixed(1) + '%')}`)
    
    // Key test scenarios covered
    console.log(chalk.white('\n✅ Test Coverage:'))
    console.log('  • All 5 AGILE documents generation')
    console.log('  • All 6 PRINCE2 documents generation')
    console.log('  • All 5 HYBRID documents generation')
    console.log('  • Technical Landscape included in all methodologies')
    console.log('  • Comparable Projects included in all methodologies')
    console.log('  • GPT-5 nano configuration')
    console.log('  • Provider fallback chain')
    console.log('  • Retry logic (3 attempts)')
    console.log('  • Fallback content generation')
    console.log('  • PII sanitization')
    console.log('  • Performance benchmarks (<90s)')
    console.log('  • Error recovery')
    console.log('  • Concurrent generation')
    
    // Final status
    if (failedTests === 0) {
      console.log(chalk.green.bold('\n🎉 All tests passed! The document generation system is working correctly.\n'))
      process.exit(0)
    } else {
      console.log(chalk.red.bold(`\n⚠️  ${failedTests} test group(s) failed. Please review the errors above.\n`))
      process.exit(1)
    }
  }
}

// Check if chalk is available, if not, provide fallback
const chalk = {
  blue: { bold: (text: string) => text },
  green: { bold: (text: string) => text },
  red: { bold: (text: string) => text },
  yellow: (text: string) => text,
  gray: (text: string) => text,
  white: (text: string) => text,
  cyan: (text: string) => text,
  green: (text: string) => text,
  red: (text: string) => text
}

// Run the test suite
const runner = new TestSuiteRunner()
runner.run().catch(error => {
  console.error('Fatal error running test suite:', error)
  process.exit(1)
})