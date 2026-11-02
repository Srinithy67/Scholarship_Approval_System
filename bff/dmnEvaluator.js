// Evaluator for scholarship_eligibility DMN decision table
// Based directly on dmn/scholarship-eligibility.dmn (Hit policy: FIRST)

function evaluateScholarshipEligibility(input) {
  const { incomeSlab, academicCriteriaMet, cgpa } = input;

  // Rule 1: academic gate
  if (academicCriteriaMet === false) {
    return {
      eligibility: "Ineligible",
      scholarshipCategory: "NONE",
      scholarshipAmount: 0,
      decisionReason: "Academic criteria not met (CGPA, attendance or backlogs)",
      matchedRule: "Rule_1"
    };
  }

  // Rule 2: income gate
  if (incomeSlab === "HIGH") {
    return {
      eligibility: "Ineligible",
      scholarshipCategory: "NONE",
      scholarshipAmount: 0,
      decisionReason: "Family income above the scholarship limit",
      matchedRule: "Rule_2"
    };
  }

  // Rule 3: Low income slab and CGPA >= 8.5
  if (incomeSlab === "LOW" && cgpa >= 8.5 && academicCriteriaMet === true) {
    return {
      eligibility: "Eligible",
      scholarshipCategory: "FULL_TUITION_WAIVER",
      scholarshipAmount: 100000,
      decisionReason: "Low income slab and CGPA 8.5 or above",
      matchedRule: "Rule_3"
    };
  }

  // Rule 4: Low income slab and CGPA [7.5..8.5)
  if (incomeSlab === "LOW" && cgpa >= 7.5 && cgpa < 8.5 && academicCriteriaMet === true) {
    return {
      eligibility: "Eligible",
      scholarshipCategory: "PARTIAL_A",
      scholarshipAmount: 60000,
      decisionReason: "Low income slab and CGPA 7.5 to below 8.5",
      matchedRule: "Rule_4"
    };
  }

  // Rule 5: Middle income slab and CGPA >= 8.5
  if (incomeSlab === "MIDDLE" && cgpa >= 8.5 && academicCriteriaMet === true) {
    return {
      eligibility: "Eligible",
      scholarshipCategory: "PARTIAL_B",
      scholarshipAmount: 40000,
      decisionReason: "Middle income slab and CGPA 8.5 or above",
      matchedRule: "Rule_5"
    };
  }

  // Rule 6: Middle income slab and CGPA [7.5..8.5)
  if (incomeSlab === "MIDDLE" && cgpa >= 7.5 && cgpa < 8.5 && academicCriteriaMet === true) {
    return {
      eligibility: "Eligible",
      scholarshipCategory: "PARTIAL_C",
      scholarshipAmount: 25000,
      decisionReason: "Middle income slab and CGPA 7.5 to below 8.5",
      matchedRule: "Rule_6"
    };
  }

  // Rule 7: Catch-all
  return {
    eligibility: "Ineligible",
    scholarshipCategory: "NONE",
    scholarshipAmount: 0,
    decisionReason: "No scholarship scheme matched",
    matchedRule: "Rule_7"
  };
}

module.exports = { evaluateScholarshipEligibility };
