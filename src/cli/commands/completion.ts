import { error } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish', 'powershell'] as const;
type Shell = (typeof SUPPORTED_SHELLS)[number];

export function completionCommand(shell: string): void {
  if (!isSupportedShell(shell)) {
    error(`Unknown shell "${shell}". Supported: ${SUPPORTED_SHELLS.join(', ')}.`);
    process.exit(EXIT.USAGE);
  }

  const commands = TOP_LEVEL_COMMANDS.join(' ');

  switch (shell) {
    case 'bash':
      process.stdout.write(bashScript(commands));
      break;
    case 'zsh':
      process.stdout.write(zshScript(commands));
      break;
    case 'fish':
      process.stdout.write(fishScript());
      break;
    case 'powershell':
      process.stdout.write(powershellScript(commands));
      break;
  }
}

function isSupportedShell(value: string): value is Shell {
  return (SUPPORTED_SHELLS as readonly string[]).includes(value);
}

const TOP_LEVEL_COMMANDS = [
  'init',
  'add',
  'remove',
  'generate',
  'doctor',
  'lint',
  'learn',
  'version',
  'report',
  'eject',
  'upgrade',
  'fix',
  'rules',
  'presets',
  'config',
  'cloud',
  'sync',
  'ignore',
  'completion',
  'help',
];

function bashScript(commands: string): string {
  return `# vguard bash completion
# Install: vguard completion bash > /etc/bash_completion.d/vguard
#          source <(vguard completion bash)
_vguard_ids() {
  # $1 = subcommand tuple, e.g. "rules list --all"
  vguard $1 --json 2>/dev/null \\
    | node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const r of d)console.log(r.id)}catch{}' 2>/dev/null
}

_vguard_complete() {
  local cur prev prev2
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  prev2="\${COMP_WORDS[COMP_CWORD-2]:-}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${commands}" -- "\${cur}") )
    return 0
  fi

  # Dynamic: rule / preset IDs
  if [[ "\${prev2}" == "rules" && ( "\${prev}" == "enable" || "\${prev}" == "disable" ) ]]; then
    COMPREPLY=( $(compgen -W "$(_vguard_ids 'rules list --all')" -- "\${cur}") )
    return 0
  fi
  if [[ "\${prev2}" == "presets" && ( "\${prev}" == "add" || "\${prev}" == "remove" ) ]]; then
    COMPREPLY=( $(compgen -W "$(_vguard_ids 'presets list')" -- "\${cur}") )
    return 0
  fi
  if [[ "\${prev}" == "add" || "\${prev}" == "remove" ]] && [[ \${COMP_CWORD} -eq 2 ]]; then
    local rules="$(_vguard_ids 'rules list --all')"
    local presets="$(_vguard_ids 'presets list')"
    local prefixed=""
    for p in $presets; do prefixed="$prefixed preset:$p"; done
    COMPREPLY=( $(compgen -W "$rules $prefixed" -- "\${cur}") )
    return 0
  fi

  # Static: subcommand enumerations
  case "\${prev}" in
    rules)    COMPREPLY=( $(compgen -W "list enable disable" -- "\${cur}") ) ;;
    presets)  COMPREPLY=( $(compgen -W "list add remove" -- "\${cur}") ) ;;
    config)   COMPREPLY=( $(compgen -W "show set" -- "\${cur}") ) ;;
    cloud)    COMPREPLY=( $(compgen -W "login logout connect status" -- "\${cur}") ) ;;
    ignore)   COMPREPLY=( $(compgen -W "list add remove check init" -- "\${cur}") ) ;;
    completion) COMPREPLY=( $(compgen -W "bash zsh fish powershell" -- "\${cur}") ) ;;
  esac
}
complete -F _vguard_complete vguard
`;
}

function zshScript(commands: string): string {
  return `#compdef vguard
# vguard zsh completion
# Install: vguard completion zsh > "\${fpath[1]}/_vguard"
_vguard_ids() {
  vguard \${(z)1} --json 2>/dev/null \\
    | node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const r of d)console.log(r.id)}catch{}' 2>/dev/null
}

_vguard() {
  local -a commands
  commands=(${commands
    .split(' ')
    .map((c) => `'${c}:${c}'`)
    .join(' ')})

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  # Dynamic
  if [[ "\${words[2]}" == "rules" && ( "\${words[3]}" == "enable" || "\${words[3]}" == "disable" ) && CURRENT -eq 4 ]]; then
    local -a ids; ids=(\${(f)"$(_vguard_ids 'rules list --all')"})
    _describe 'rule' ids
    return
  fi
  if [[ "\${words[2]}" == "presets" && ( "\${words[3]}" == "add" || "\${words[3]}" == "remove" ) && CURRENT -eq 4 ]]; then
    local -a ids; ids=(\${(f)"$(_vguard_ids 'presets list')"})
    _describe 'preset' ids
    return
  fi
  if [[ ( "\${words[2]}" == "add" || "\${words[2]}" == "remove" ) && CURRENT -eq 3 ]]; then
    local -a rules; rules=(\${(f)"$(_vguard_ids 'rules list --all')"})
    local -a presets; presets=(\${(f)"$(_vguard_ids 'presets list')"})
    local -a prefixed=(\${presets/#/preset:})
    _describe 'rule' rules
    _describe 'preset' prefixed
    return
  fi

  case "\${words[2]}" in
    rules)   _values 'subcommand' list enable disable ;;
    presets) _values 'subcommand' list add remove ;;
    config)  _values 'subcommand' show set ;;
    cloud)   _values 'subcommand' login logout connect status ;;
    ignore)  _values 'subcommand' list add remove check init ;;
    completion) _values 'shell' bash zsh fish powershell ;;
  esac
}
compdef _vguard vguard
`;
}

function fishScript(): string {
  return `# vguard fish completion
# Install: vguard completion fish > ~/.config/fish/completions/vguard.fish
complete -c vguard -f

function __vguard_ids
    vguard $argv --json 2>/dev/null | node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const r of d)console.log(r.id)}catch{}' 2>/dev/null
end

complete -c vguard -n '__fish_use_subcommand' -a init       -d 'Interactive setup wizard'
complete -c vguard -n '__fish_use_subcommand' -a add        -d 'Add a rule or preset'
complete -c vguard -n '__fish_use_subcommand' -a remove     -d 'Remove a rule or preset'
complete -c vguard -n '__fish_use_subcommand' -a generate   -d 'Regenerate hook scripts'
complete -c vguard -n '__fish_use_subcommand' -a doctor     -d 'Validate config and hook health'
complete -c vguard -n '__fish_use_subcommand' -a lint       -d 'Static analysis lint'
complete -c vguard -n '__fish_use_subcommand' -a learn      -d 'Scan codebase for conventions'
complete -c vguard -n '__fish_use_subcommand' -a report     -d 'Generate quality dashboard'
complete -c vguard -n '__fish_use_subcommand' -a eject      -d 'Export standalone hooks'
complete -c vguard -n '__fish_use_subcommand' -a upgrade    -d 'Check for and apply updates'
complete -c vguard -n '__fish_use_subcommand' -a fix        -d 'Auto-fix issues'
complete -c vguard -n '__fish_use_subcommand' -a rules      -d 'Manage rules'
complete -c vguard -n '__fish_use_subcommand' -a presets    -d 'Manage presets'
complete -c vguard -n '__fish_use_subcommand' -a config     -d 'View and modify configuration'
complete -c vguard -n '__fish_use_subcommand' -a cloud      -d 'VGuard Cloud commands'
complete -c vguard -n '__fish_use_subcommand' -a sync       -d 'Upload rule-hits data to Cloud'
complete -c vguard -n '__fish_use_subcommand' -a ignore     -d 'Manage .vguardignore'
complete -c vguard -n '__fish_use_subcommand' -a completion -d 'Generate shell completion script'
complete -c vguard -n '__fish_use_subcommand' -a version    -d 'Display the installed version'

# Dynamic IDs
complete -c vguard -n '__fish_seen_subcommand_from rules; and __fish_seen_subcommand_from enable disable' -xa '(__vguard_ids rules list --all)'
complete -c vguard -n '__fish_seen_subcommand_from presets; and __fish_seen_subcommand_from add remove' -xa '(__vguard_ids presets list)'
complete -c vguard -n '__fish_seen_subcommand_from add remove; and not __fish_seen_subcommand_from rules presets' -xa '(__vguard_ids rules list --all) (__vguard_ids presets list | string replace -r "^" "preset:")'
`;
}

function powershellScript(commands: string): string {
  return `# vguard PowerShell completion
# Install: vguard completion powershell >> $PROFILE ; . $PROFILE
Register-ArgumentCompleter -Native -CommandName vguard -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $tokens = $commandAst.CommandElements | ForEach-Object { $_.ToString() }
  $nTokens = $tokens.Count

  function Get-VguardIds($args) {
    try {
      $json = & vguard @args --json 2>$null
      if ($json) { ($json | ConvertFrom-Json) | ForEach-Object { $_.id } }
    } catch {}
  }

  # Position 2: top-level command
  if ($nTokens -le 2) {
    $commands = @(${commands
      .split(' ')
      .map((c) => `'${c}'`)
      .join(', ')})
    return $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
  }

  $cmd = $tokens[1]
  $sub = if ($nTokens -ge 3) { $tokens[2] } else { '' }

  $options = @()
  if ($cmd -eq 'rules' -and ($sub -eq 'enable' -or $sub -eq 'disable') -and $nTokens -le 4) {
    $options = Get-VguardIds @('rules', 'list', '--all')
  }
  elseif ($cmd -eq 'presets' -and ($sub -eq 'add' -or $sub -eq 'remove') -and $nTokens -le 4) {
    $options = Get-VguardIds @('presets', 'list')
  }
  elseif (($cmd -eq 'add' -or $cmd -eq 'remove') -and $nTokens -le 3) {
    $rules = Get-VguardIds @('rules', 'list', '--all')
    $presets = Get-VguardIds @('presets', 'list') | ForEach-Object { "preset:$_" }
    $options = @($rules) + @($presets)
  }
  elseif ($nTokens -le 3) {
    switch ($cmd) {
      'rules'      { $options = 'list','enable','disable' }
      'presets'    { $options = 'list','add','remove' }
      'config'     { $options = 'show','set' }
      'cloud'      { $options = 'login','logout','connect','status' }
      'ignore'     { $options = 'list','add','remove','check','init' }
      'completion' { $options = 'bash','zsh','fish','powershell' }
    }
  }

  $options | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
    [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
  }
}
`;
}
