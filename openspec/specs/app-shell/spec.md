# app-shell

## Purpose

Defines the persistent application shell, including the top app bar that frames every screen. It ensures the shell presents only controls that lead somewhere or perform a defined action.

## Requirements

### Requirement: Top app bar presents only navigable controls

The persistent top app bar SHALL present only controls that lead to a reachable destination or perform a defined action. It SHALL NOT render a settings (gear) control, because no settings destination exists in the application.

#### Scenario: Settings control is absent on every screen

- **WHEN** any screen that mounts the top app bar is displayed (home, accounts, account detail, budgets, budget detail, add transaction, reconcile)
- **THEN** no settings (gear) icon or button is rendered in the top app bar

#### Scenario: Remaining top bar controls are functional

- **WHEN** the top app bar renders a control (e.g. the back button on detail screens)
- **THEN** that control performs its defined action (back navigation) and no rendered control is a no-op
