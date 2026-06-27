# Architecture Decision Records (ADR)

このディレクトリには、プロジェクトの重要なアーキテクチャ決定を記録したADR（Architecture Decision Record）を保管しています。

## ADR一覧

- [ADR-001: 主要依存関係のメジャーバージョン更新計画（2026年下半期）](./001-major-dependency-updates-2026-h2.md)
  - React 18→19, TypeScript 5→6, Vite 5→8, Firebase 10→12等の計画的アップデート戦略

## ADRとは

ADR（Architecture Decision Record）は、ソフトウェアプロジェクトにおける重要な設計判断を記録するためのドキュメントです。

### ADRを書くべきタイミング

- メジャーバージョンの依存関係更新を延期する場合
- 技術スタックの大きな変更（例: CSS-in-JS → Tailwind）
- 新しいアーキテクチャパターンの導入
- パフォーマンス最適化のトレードオフ判断
- セキュリティポリシーの変更

### ADRの構成

各ADRは以下のセクションを含みます:

1. **Title**: 決定の要約（ファイル名にも反映）
2. **Status**: Proposed / Accepted / Deprecated / Superseded
3. **Context**: 背景・問題・制約条件
4. **Decision**: 採用した解決策
5. **Consequences**: 結果・トレードオフ
6. **References**: 関連リンク・ドキュメント

## 命名規則

```
XXX-kebab-case-title.md
```

- `XXX`: 3桁の連番（001, 002, ...）
- `kebab-case-title`: 内容を表すケバブケース文字列

## 参考資料

- [ADR GitHub](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
