#!/usr/bin/env bun
/**
 * Setup verification script - checks if all dependencies and requirements are ready
 * Run from project root: bun run scripts/checkSetup.ts
 */

import { existsSync } from "fs";
import { join } from "path";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, status: "pass" | "fail" | "warn", message: string) {
  results.push({ name, status, message });
}

function checkDirectories(): void {
  const dirs = [
    { path: "public/images/snakes", name: "Image directory" },
    { path: "temp", name: "Temp directory" },
    { path: "scripts", name: "Scripts directory" },
    { path: "docs", name: "Docs directory" },
  ];

  for (const dir of dirs) {
    const fullPath = join(__dirname, "..", dir.path);
    if (existsSync(fullPath)) {
      addResult(dir.name, "pass", `Exists: ${dir.path}`);
    } else {
      addResult(dir.name, "warn", `Missing: ${dir.path} (will be created automatically)`);
    }
  }
}

function checkScripts(): void {
  const scripts = [
    "imageProcessing.ts",
    "sourceSnakeImages.ts",
    "processAllSnakes.ts",
    "replaceSnakeImage.ts",
    "validateImages.ts",
    "testPilot.ts",
  ];

  for (const script of scripts) {
    const scriptPath = join(__dirname, script);
    if (existsSync(scriptPath)) {
      addResult(`Script: ${script}`, "pass", "✓");
    } else {
      addResult(`Script: ${script}`, "fail", "Missing");
    }
  }
}

function checkDocumentation(): void {
  const docs = [
    "IMAGE_MANAGEMENT.md",
    "IMPLEMENTATION_SUMMARY.md",
    "QUICK_REFERENCE.md",
  ];

  for (const doc of docs) {
    const docPath = join(__dirname, "..", "docs", doc);
    if (existsSync(docPath)) {
      addResult(`Doc: ${doc}`, "pass", "✓");
    } else {
      addResult(`Doc: ${doc}`, "warn", "Missing");
    }
  }
}

function checkDataFile(): void {
  const dataPath = join(__dirname, "..", "data", "snakes", "index.json");
  if (existsSync(dataPath)) {
    addResult("Snake data", "pass", "data/snakes/index.json exists");
  } else {
    addResult("Snake data", "fail", "data/snakes/index.json not found");
  }
}

async function main() {
  console.log("🔍 Snake Dashboard Setup Verification");
  console.log("======================================\n");

  console.log("Checking directories...");
  checkDirectories();

  console.log("\nChecking scripts...");
  checkScripts();

  console.log("\nChecking documentation...");
  checkDocumentation();

  console.log("\nChecking data files...");
  checkDataFile();

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("📊 SETUP STATUS");
  console.log("=".repeat(60) + "\n");

  const passes = results.filter((r) => r.status === "pass");
  const fails = results.filter((r) => r.status === "fail");
  const warns = results.filter((r) => r.status === "warn");

  // Group by status
  if (passes.length > 0) {
    console.log("✅ PASSING:");
    passes.forEach((r) => console.log(`   ${r.name.padEnd(30)} ${r.message}`));
  }

  if (warns.length > 0) {
    console.log("\n⚠️  WARNINGS:");
    warns.forEach((r) => console.log(`   ${r.name.padEnd(30)} ${r.message}`));
  }

  if (fails.length > 0) {
    console.log("\n❌ FAILURES:");
    fails.forEach((r) => console.log(`   ${r.name.padEnd(30)} ${r.message}`));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${results.length} checks`);
  console.log(`✅ Pass: ${passes.length}`);
  console.log(`⚠️  Warn: ${warns.length}`);
  console.log(`❌ Fail: ${fails.length}`);
  console.log("=".repeat(60));

  // Final recommendation
  if (fails.length === 0 && warns.length === 0) {
    console.log("\n🎉 All checks passed! Ready to process images.");
    console.log("\nNext steps:");
    console.log("  1. Test with pilot: bun run images:test");
    console.log("  2. Review test images");
    console.log("  3. Process all: bun run images:process");
    console.log("  4. Or with gallery: bun run images:process --gallery");
  } else if (fails.length === 0) {
    console.log("\n✅ Setup complete with minor warnings (can be ignored).");
    console.log("\nReady to proceed:");
    console.log("  bun run images:test");
  } else {
    console.log("\n⚠️  Setup incomplete. Please address failures above.");
  }

  console.log("\n💡 Note: No Python dependencies required - simplified pipeline!");

  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
