import { describe, it, expect } from "vitest";
import { detectLevel, detectRoleFamily } from "@/lib/normalize";

describe("detectLevel", () => {
  describe("internship detection", () => {
    it("detects 'internship' in title", () => {
      expect(detectLevel("Software Engineer Internship")).toBe("internship");
    });

    it("detects 'intern' in title", () => {
      expect(detectLevel("Software Engineer Intern")).toBe("internship");
    });

    it("detects 'summer intern' in title", () => {
      expect(detectLevel("Summer Intern Software Engineer")).toBe("internship");
    });

    it("detects 'winter intern' in title", () => {
      expect(detectLevel("Winter Intern Software Engineer")).toBe("internship");
    });

    it("detects 'fall intern' in title", () => {
      expect(detectLevel("Fall Intern Software Engineer")).toBe("internship");
    });

    it("detects 'spring intern' in title", () => {
      expect(detectLevel("Spring Intern Software Engineer")).toBe("internship");
    });

    it("detects 'summer 2025 intern' in title", () => {
      expect(detectLevel("Summer 2025 Intern")).toBe("internship");
    });

    it("detects 'fall 2026 internship' in title", () => {
      expect(detectLevel("Fall 2026 Internship")).toBe("internship");
    });

    it("detects 'spring 2027 intern' in title", () => {
      expect(detectLevel("Spring 2027 Intern")).toBe("internship");
    });

    it("detects '2026 summer intern' in title", () => {
      expect(detectLevel("2026 Summer Intern")).toBe("internship");
    });

    it("is case insensitive", () => {
      expect(detectLevel("SOFTWARE ENGINEER INTERN")).toBe("internship");
      expect(detectLevel("software engineer intern")).toBe("internship");
      expect(detectLevel("Software Engineer Intern")).toBe("internship");
    });

    it("handles whitespace normalization", () => {
      expect(detectLevel("  Software Engineer Intern  ")).toBe("internship");
      expect(detectLevel("Software  Engineer  Intern")).toBe("internship");
    });
  });

  describe("co-op detection", () => {
    it("detects 'co-op' in title", () => {
      expect(detectLevel("Co-op Software Engineer")).toBe("co-op");
    });

    it("detects 'coop' in title", () => {
      expect(detectLevel("Coop Software Engineer")).toBe("co-op");
    });

    it("detects 'cooperative education' in title", () => {
      expect(detectLevel("Cooperative Education Program")).toBe("co-op");
    });

    it("detects 'placement year' in title", () => {
      expect(detectLevel("Placement Year Student")).toBe("co-op");
    });

    it("is case insensitive", () => {
      expect(detectLevel("CO-OP SOFTWARE ENGINEER")).toBe("co-op");
      expect(detectLevel("coop software engineer")).toBe("co-op");
    });

    it("handles whitespace normalization", () => {
      expect(detectLevel("  Co-op Software Engineer  ")).toBe("co-op");
    });
  });

  describe("fellowship detection", () => {
    it("detects 'fellowship' in title", () => {
      expect(detectLevel("Research Fellowship")).toBe("fellowship");
    });

    it("detects 'fellow' in title", () => {
      expect(detectLevel("Software Engineering Fellow")).toBe("fellowship");
    });

    it("detects 'fellows program' in title", () => {
      expect(detectLevel("Fellows Program - Software Engineering")).toBe("fellowship");
    });

    it("detects named fellowships", () => {
      expect(detectLevel("XRDS Fellow")).toBe("fellowship");
      expect(detectLevel("Google PhD Fellowship")).toBe("fellowship");
      expect(detectLevel("Facebook Fellowship")).toBe("fellowship");
      expect(detectLevel("Microsoft Research PhD Fellowship")).toBe("fellowship");
      expect(detectLevel("NVIDIA Graduate Fellowship")).toBe("fellowship");
    });

    it("is case insensitive", () => {
      expect(detectLevel("RESEARCH FELLOWSHIP")).toBe("fellowship");
      expect(detectLevel("software engineering fellow")).toBe("fellowship");
    });

    it("prefers fellowship over internship when both present", () => {
      expect(detectLevel("Software Engineering Fellowship Internship")).toBe("fellowship");
      expect(detectLevel("Fellow Intern Program")).toBe("fellowship");
    });

    it("prefers fellowship over co-op when both present", () => {
      expect(detectLevel("Co-op Fellowship Program")).toBe("fellowship");
    });
  });

  describe("priority ordering", () => {
    it("fellowship > co-op > internship when multiple present", () => {
      expect(detectLevel("Fellowship Co-op Internship")).toBe("fellowship");
      expect(detectLevel("Co-op Internship")).toBe("co-op");
    });
  });

  describe("negative cases", () => {
    it("returns null for full-time role titles", () => {
      expect(detectLevel("Software Engineer")).toBeNull();
      expect(detectLevel("Senior Software Engineer")).toBeNull();
      expect(detectLevel("Staff Software Engineer")).toBeNull();
      expect(detectLevel("Principal Software Engineer")).toBeNull();
    });

    it("returns null for new grad / entry level titles", () => {
      expect(detectLevel("New Grad Software Engineer")).toBeNull();
      expect(detectLevel("Entry Level Software Engineer")).toBeNull();
      expect(detectLevel("Junior Software Engineer")).toBeNull();
    });

    it("returns null for unrelated titles", () => {
      expect(detectLevel("Product Manager")).toBeNull();
      expect(detectLevel("Data Scientist")).toBeNull();
      expect(detectLevel("Engineering Manager")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectLevel("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
      expect(detectLevel("   ")).toBeNull();
    });

    it("returns null for titles containing 'intern' as part of unrelated word", () => {
      expect(detectLevel("Internal Tools Engineer")).toBeNull();
      expect(detectLevel("International Business Developer")).toBeNull();
    });

    it("hard-drops seniority titles without include signal", () => {
      expect(detectLevel("Senior Software Engineer")).toBeNull();
      expect(detectLevel("Staff Engineer")).toBeNull();
      expect(detectLevel("Principal Engineer")).toBeNull();
      expect(detectLevel("Engineering Manager")).toBeNull();
      expect(detectLevel("Manager of Engineering")).toBeNull();
      expect(detectLevel("Head of Engineering")).toBeNull();
      expect(detectLevel("Director of Engineering")).toBeNull();
      expect(detectLevel("VP Engineering")).toBeNull();
      expect(detectLevel("Tech Lead")).toBeNull();
    });

    it("hard-drops new-grad signals even with include signal", () => {
      expect(detectLevel("New Grad Software Engineer Intern")).toBeNull();
      expect(detectLevel("New Graduate Program Intern")).toBeNull();
      expect(detectLevel("Graduate Development Program Intern")).toBeNull();
      expect(detectLevel("Early Career Engineer Intern")).toBeNull();
      expect(detectLevel("Development Program Intern")).toBeNull();
      expect(detectLevel("Rotational Program Intern")).toBeNull();
      expect(detectLevel("Campus Hire Intern")).toBeNull();
      expect(detectLevel("Entry Level Engineer Intern")).toBeNull();
      expect(detectLevel("Campus to Career Intern")).toBeNull();
    });
  });

  describe("seniority with include signal (include wins)", () => {
    it("allows seniority when include signal present", () => {
      expect(detectLevel("Senior Intern")).toBe("internship");
      expect(detectLevel("Staff Co-op")).toBe("co-op");
    });
  });

  describe("edge cases", () => {
    it("handles titles with special characters", () => {
      expect(detectLevel("Software Engineering Intern (Summer 2025)")).toBe("internship");
      expect(detectLevel("Co-op / Intern - Software")).toBe("co-op");
    });

    it("handles titles with numbers", () => {
      expect(detectLevel("Software Engineering Intern 2025")).toBe("internship");
      expect(detectLevel("Co-op 2024 - Software")).toBe("co-op");
    });

    it("handles very long titles", () => {
      const longTitle = "Software Engineering Internship Summer 2025 Remote United States Full Time";
      expect(detectLevel(longTitle)).toBe("internship");
    });
  });
});

describe("detectRoleFamily", () => {
  const cases: [string, import("@/lib/types").RoleFamily[], string][] = [
    // SWE
    ["Frontend Engineer Intern", ["swe"], "frontend keyword"],
    ["Backend Software Engineer Intern", ["swe"], "backend keyword"],
    ["Full Stack Intern", ["swe"], "full stack"],
    ["Mobile Engineer Co-op", ["swe"], "mobile"],
    ["DevOps Intern", ["swe"], "devops"],
    ["Site Reliability Engineer Intern", ["swe"], "sre"],
    ["Embedded Systems Intern", ["swe"], "embedded"],
    ["Software Engineer Intern", ["swe"], "generic swe"],
    // PM/Program
    ["Product Manager Intern", ["pm-program"], "pm"],
    ["Technical Program Manager Intern", ["pm-program"], "tpm"],
    ["Program Manager Co-op", ["pm-program"], "program manager"],
    // Hardware
    ["Silicon Design Intern", ["hardware"], "silicon"],
    ["PCB Layout Co-op", ["hardware"], "pcb"],
    ["FPGA Engineer Intern", ["hardware"], "fpga"],
    ["ASIC Verification Intern", ["hardware"], "asic"],
    // Data
    ["Data Scientist Intern", ["data"], "data scientist"],
    ["Data Engineer Intern", ["data"], "data engineer"],
    ["Analytics Intern", ["data"], "analytics"],
    // ML/AI
    ["Machine Learning Engineer Intern", ["ml"], "ml engineer"],
    ["ML Researcher Co-op", ["ml"], "ml researcher"],
    ["AI Engineer Intern", ["ml"], "ai engineer"],
    // Engineering (non-SWE)
    ["Structural Engineering Intern", ["engineering"], "structural"],
    ["Civil Engineer Co-op", ["engineering"], "civil"],
    ["Electrical Engineering Intern", ["engineering"], "electrical"],
    ["Mechanical Engineer Intern", ["engineering"], "mechanical"],
    ["Chemical Engineering Intern", ["engineering"], "chemical"],
    ["Aerospace Engineer Intern", ["engineering"], "aerospace"],
    // Design
    ["UX Designer Intern", ["design"], "ux"],
    ["UI Designer Co-op", ["design"], "ui"],
    ["Product Designer Intern", ["design"], "product design"],
    ["Interaction Designer Intern", ["design"], "interaction"],
    // Growth
    ["Growth Marketing Intern", ["growth"], "growth marketing"],
    ["Lifecycle Marketing Intern", ["growth"], "lifecycle"],
    ["User Acquisition Intern", ["growth"], "acquisition"],
    // Multi-family (title spans families)
    ["Software Engineer Intern - Hardware Team", ["swe", "hardware"], "multi-family"],
    // Unknown
    ["Random Title", [], "unknown"],
    ["", [], "empty"],
  ];

  it.each(cases)("title=%s -> %s (%s)", (title, expected, _label) => {
    expect(detectRoleFamily(title, { title, company: "Test", url: "http://x" })).toEqual(expected);
  });
});