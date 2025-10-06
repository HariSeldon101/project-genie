// Consolidated Business Case renderer
function renderBusinessCaseContent(content: any, metadata: PDFDocumentMetadata, options: PDFGenerationOptions = {}): React.ReactElement[] {
  const pages: React.ReactElement[] = []
  const numbering = new SectionNumbering()
  
  // Collect all sections first, then distribute them across pages
  const allSections: React.ReactElement[] = []
  
  // Executive Summary
  if (content.executiveSummary || content.executive_summary) {
    allSections.push(
      <PDFSection key="exec-summary" title="Executive Summary" level={1} sectionNumber={numbering.increment(1)}>
        <Text style={commonStyles.paragraph}>
          {content.executiveSummary || content.executive_summary}
        </Text>
      </PDFSection>
    )
  }
  
  // Strategic Context & Reasons
  if (content.reasons || content.strategic_context) {
    allSections.push(
      <PDFSection key="strategic" title="Strategic Context" level={1} sectionNumber={numbering.increment(1)}>
        <Text style={commonStyles.paragraph}>
          {content.reasons || content.strategic_context}
        </Text>
      </PDFSection>
    )
  }
  
  // Business Options Analysis
  if (content.businessOptions || content.options) {
    const businessOptions = content.businessOptions || content.options
    allSections.push(
      <PDFSection key="options" title="Options Analysis" level={1} sectionNumber={numbering.increment(1)}>
        {Array.isArray(businessOptions) ? (
          <ComparisonTable
            options={businessOptions.map((opt: any, idx: number) => ({
              name: opt.option || opt.name || `Option ${idx + 1}`,
              attributes: {
                Description: opt.description || '',
                'Costs': opt.costs || opt.cost || '0',
                'Benefits': opt.benefits || '',
                'Risks': opt.risks || ''
              },
              recommended: opt.option?.includes('Recommended') || opt.recommended
            }))}
          />
        ) : (
          <Text style={commonStyles.paragraph}>{businessOptions}</Text>
        )}
      </PDFSection>
    )
  }
  
  // Expected Benefits
  if (content.expectedBenefits) {
    allSections.push(
      <PDFSection key="benefits" title="Expected Benefits" level={1} sectionNumber={numbering.increment(1)}>
        <PDFTable
          headers={['Benefit', 'Baseline', 'Target', 'Measurement']}
          rows={content.expectedBenefits.map((b: any) => [
            b.benefit || '',
            b.baseline || 'N/A',
            b.target || 'TBD',
            b.measurement || 'TBD'
          ])}
          alternateRowColors={true}
        />
      </PDFSection>
    )
  }
  
  // Expected Dis-benefits
  if (content.expectedDisBenefits) {
    allSections.push(
      <PDFSection key="disbenefits" title="Expected Dis-benefits" level={1} sectionNumber={numbering.increment(1)}>
        {Array.isArray(content.expectedDisBenefits) && typeof content.expectedDisBenefits[0] === 'object' ? (
          <PDFTable
            headers={['Dis-benefit', 'Impact', 'Mitigation']}
            rows={content.expectedDisBenefits.map((d: any) => [
              d.disbenefit || d.description || '',
              d.impact || 'TBD',
              d.mitigation || 'TBD'
            ])}
            alternateRowColors={true}
          />
        ) : (
          <PDFList items={content.expectedDisBenefits} type="bullet" />
        )}
      </PDFSection>
    )
  }
  
  // Costs
  if (content.costs) {
    allSections.push(
      <PDFSection key="costs" title="Cost Analysis" level={1} sectionNumber={numbering.increment(1)}>
        <KeyValueTable data={{
          'Total Investment': content.costs.total || 'TBD',
          'Development Costs': content.costs.development || 'TBD',
          'Operational Costs': content.costs.operational || 'TBD',
          'Maintenance Costs': content.costs.maintenance || 'TBD'
        }} />
      </PDFSection>
    )
  }
  
  // Investment Appraisal
  if (content.investmentAppraisal) {
    allSections.push(
      <PDFSection key="investment" title="Investment Appraisal" level={1} sectionNumber={numbering.increment(1)}>
        <KeyValueTable data={{
          'Net Present Value (NPV)': content.investmentAppraisal.npv || 'TBD',
          'Return on Investment (ROI)': content.investmentAppraisal.roi || 'TBD',
          'Payback Period': content.investmentAppraisal.paybackPeriod || 'TBD'
        }} />
      </PDFSection>
    )
  }
  
  // Major Risks
  if (content.majorRisks) {
    allSections.push(
      <PDFSection key="risks" title="Major Risks" level={1} sectionNumber={numbering.increment(1)}>
        {Array.isArray(content.majorRisks) && typeof content.majorRisks[0] === 'object' ? (
          <PDFTable
            headers={['Risk', 'Probability', 'Impact', 'Mitigation']}
            rows={content.majorRisks.map((r: any) => [
              r.risk || r.description || '',
              r.probability || 'TBD',
              r.impact || 'TBD',
              r.mitigation || 'TBD'
            ])}
            alternateRowColors={true}
          />
        ) : (
          <PDFList items={content.majorRisks} type="bullet" />
        )}
      </PDFSection>
    )
  }
  
  // Stakeholder Analysis
  if (content.stakeholderAnalysis) {
    allSections.push(
      <PDFSection key="stakeholders" title="Stakeholder Analysis" level={1} sectionNumber={numbering.increment(1)}>
        <PDFTable
          headers={['Stakeholder', 'Interest', 'Influence', 'Attitude', 'Strategy']}
          rows={content.stakeholderAnalysis.map((s: any) => [
            s.stakeholder || '',
            s.interest || 'TBD',
            s.influence || 'TBD',
            s.attitude || 'TBD',
            s.strategy || 'TBD'
          ])}
          alternateRowColors={true}
        />
      </PDFSection>
    )
  }
  
  // Success Criteria
  if (content.successCriteria) {
    allSections.push(
      <PDFSection key="success" title="Success Criteria" level={1} sectionNumber={numbering.increment(1)}>
        <Checklist
          items={content.successCriteria.map((criteria: string) => ({
            text: criteria,
            checked: false
          }))}
          showProgress={true}
        />
      </PDFSection>
    )
  }
  
  // Recommendation
  if (content.recommendation) {
    allSections.push(
      <PDFSection key="recommendation" title="Recommendation" level={1} sectionNumber={numbering.increment(1)}>
        <HighlightBox title="Recommended Action" color={colors.primary.main}>
          <Text style={commonStyles.paragraph}>
            {content.recommendation}
          </Text>
        </HighlightBox>
      </PDFSection>
    )
  }
  
  // Now distribute all sections across pages efficiently
  // Determine sections per page based on content type
  const sectionsPerPage = 2 // Default to 2-3 sections per page
  
  // Special handling for landscape tables
  const landscapeSections = ['stakeholders', 'options']
  
  for (let i = 0; i < allSections.length; i++) {
    const section = allSections[i]
    const sectionKey = section.key as string
    
    // Check if this section needs landscape orientation
    const needsLandscape = landscapeSections.includes(sectionKey)
    
    if (needsLandscape) {
      // Landscape sections get their own page
      pages.push(
        <Page key={`page-${pages.length + 1}`} size="A4" orientation="landscape" style={pageStyles.landscapePage}>
          <ProjectGenieWatermark whiteLabel={options.whiteLabel} customText={options.watermarkText} />
          {options.showDraft && <DraftWatermark version={metadata.version.toString()} />}
          {options.classification && <ConfidentialWatermark classification={options.classification} />}
          {section}
        </Page>
      )
    } else {
      // Regular sections - group them
      const pageSections = [section]
      
      // Try to add next section if it fits
      if (i + 1 < allSections.length && !landscapeSections.includes(allSections[i + 1].key as string)) {
        pageSections.push(allSections[++i])
      }
      
      pages.push(
        <Page key={`page-${pages.length + 1}`} size="A4" style={pageStyles.page}>
          <ProjectGenieWatermark whiteLabel={options.whiteLabel} customText={options.watermarkText} />
          {options.showDraft && <DraftWatermark version={metadata.version.toString()} />}
          {options.classification && <ConfidentialWatermark classification={options.classification} />}
          {pageSections}
        </Page>
      )
    }
  }
  
  return pages
}