import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { extractMetadata } from '../src/parser';
import { computeContentHash } from '../src/hash';

describe('CodeFunc Core - Hash & Parser Tests', () => {
  test('computeContentHash produces consistent MD5 hashes', () => {
    const code = 'print("hello world")';
    const hash1 = computeContentHash(code, 'python');
    const hash2 = computeContentHash(code, 'python');
    const hashDiffLang = computeContentHash(code, 'javascript');

    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hashDiffLang);
    assert.strictEqual(hash1.length, 32);
  });

  test('extractMetadata correctly extracts Python dependencies, I/O, and signatures', () => {
    const pythonCode = `
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

class DataProcessor:
    def __init__(self, filepath):
        self.filepath = filepath

    def load_data(self):
        with open("dataset.csv", "r") as f:
            return f.read()

    def fetch_api(self):
        import requests
        return requests.get("https://api.example.com/data")
`;

    const meta = extractMetadata(pythonCode, 'python');
    assert.ok(meta.dependencies.includes('numpy'), 'Should include numpy');
    assert.ok(meta.dependencies.includes('tensorflow'), 'Should include tensorflow');
    assert.ok(meta.dependencies.includes('sklearn'), 'Should include sklearn');
    assert.ok(meta.dependencies.includes('requests'), 'Should include requests');
    assert.ok(meta.sideEffects.some((e) => e.includes('dataset.csv')), 'Should identify dataset.csv');
    assert.ok(meta.sideEffects.some((e) => e.includes('network HTTP calls')), 'Should identify HTTP calls');
    assert.ok(meta.signatures.some((s) => s.includes('DataProcessor')), 'Should capture class signature');
  });

  test('extractMetadata correctly extracts TypeScript/JavaScript dependencies and I/O', () => {
    const tsCode = `
import express from 'express';
import { readFileSync } from 'fs';
import axios from 'axios';

export async function handleRequest(req: any, res: any) {
  const config = readFileSync('config.json', 'utf8');
  const response = await axios.get('https://api.service.io/status');
  res.json({ status: 'ok' });
}
`;

    const meta = extractMetadata(tsCode, 'typescript');
    assert.ok(meta.dependencies.includes('express'), 'Should include express');
    assert.ok(meta.dependencies.includes('fs'), 'Should include fs');
    assert.ok(meta.dependencies.includes('axios'), 'Should include axios');
    assert.ok(meta.sideEffects.some((e) => e.includes('config.json')), 'Should detect config.json access');
    assert.ok(meta.sideEffects.some((e) => e.includes('HTTP request')), 'Should detect HTTP request');
  });

  test('extractMetadata correctly extracts Go dependencies and I/O', () => {
    const goCode = `
package main

import (
  "fmt"
  "os"
  "net/http"
)

func main() {
  file, _ := os.Open("config.yaml")
  resp, _ := http.Get("https://golang.org")
  fmt.Println(file, resp)
}
`;

    const meta = extractMetadata(goCode, 'go');
    assert.ok(meta.dependencies.includes('fmt'), 'Should include fmt');
    assert.ok(meta.dependencies.includes('os'), 'Should include os');
    assert.ok(meta.dependencies.includes('http'), 'Should include http');
    assert.ok(meta.sideEffects.includes('file system I/O'), 'Should detect file system I/O');
    assert.ok(meta.sideEffects.includes('HTTP network calls'), 'Should detect HTTP calls');
  });

  test('extractMetadata correctly extracts Dockerfile base images, ports, and commands', () => {
    const dockerCode = `
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;

    const meta = extractMetadata(dockerCode, 'dockerfile');
    assert.ok(meta.dependencies.includes('python:3.11-slim'), 'Should extract base image');
    assert.ok(meta.sideEffects.some((s) => s.includes('8000')), 'Should identify exposed port 8000');
    assert.ok(meta.signatures.some((s) => s.includes('builder')), 'Should detect multi-stage name builder');
    assert.ok(meta.patterns?.includes('Docker Container Build'), 'Should detect Docker Container Build pattern');
  });

  test('extractMetadata correctly extracts Docker Compose services and ports from YAML', () => {
    const yamlCode = `
version: '3.8'
services:
  web:
    image: node:20-alpine
    ports:
      - "3000:3000"
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
`;

    const meta = extractMetadata(yamlCode, 'yaml');
    assert.ok(meta.dependencies.includes('node:20-alpine'), 'Should extract node image');
    assert.ok(meta.dependencies.includes('postgres:15'), 'Should extract postgres image');
    assert.ok(meta.signatures.some((s) => s.includes('web')), 'Should identify web service');
    assert.ok(meta.signatures.some((s) => s.includes('db')), 'Should identify db service');
    assert.ok(meta.sideEffects.some((s) => s.includes('3000:3000')), 'Should detect port binding');
    assert.ok(meta.patterns?.includes('Docker Compose Multi-Service'), 'Should detect Docker Compose pattern');
  });
});

