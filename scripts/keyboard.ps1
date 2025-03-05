
      param (
        [string]$action,
        [string]$text,
        [string]$key
      )

      Add-Type -AssemblyName System.Windows.Forms

      if ($action -eq "type") {
        [System.Windows.Forms.SendKeys]::SendWait($text)
      }
      elseif ($action -eq "key") {
        [System.Windows.Forms.SendKeys]::SendWait($key)
      }
      elseif ($action -eq "combo") {
        $keys = $key -split "\+"
        foreach ($k in $keys) {
          if ($k -eq "control") { [System.Windows.Forms.SendKeys]::SendWait("^") }
          elseif ($k -eq "alt") { [System.Windows.Forms.SendKeys]::SendWait("%") }
          elseif ($k -eq "shift") { [System.Windows.Forms.SendKeys]::SendWait("+") }
          else { [System.Windows.Forms.SendKeys]::SendWait($k) }
        }
      }
    